"""
Kiosk routes for Raspberry Pi deployment.
Students can borrow/return components without logging in.
They just need to enter their Roll Number and Name.
"""
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
from ..database import get_database
from ..models import TransactionStatus, ComponentResponse

router = APIRouter(prefix="/kiosk", tags=["Kiosk"])


# =====================
# Kiosk Request/Response Models
# =====================

class StudentInfo(BaseModel):
    roll_number: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)


class BorrowRequest(BaseModel):
    roll_number: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    component_id: str
    quantity: int = Field(1, ge=1)
    purpose: Optional[str] = None


class ReturnRequest(BaseModel):
    transaction_id: str
    condition: Optional[str] = "good"  # good, damaged, partial


class BorrowedItem(BaseModel):
    transaction_id: str
    component_id: str
    component_name: str
    quantity: int
    borrowed_at: datetime
    location: Optional[str] = None


class StudentBorrowedResponse(BaseModel):
    roll_number: str
    name: str
    items: List[BorrowedItem]
    total_items: int


class KioskComponentResponse(BaseModel):
    id: str
    name: str
    category: str
    available_quantity: int
    total_quantity: int
    location: Optional[str] = None
    description: Optional[str] = None


class KioskComponentListResponse(BaseModel):
    components: List[KioskComponentResponse]
    total: int


class BorrowResponse(BaseModel):
    success: bool
    message: str
    transaction_id: Optional[str] = None
    component_name: Optional[str] = None
    quantity: Optional[int] = None


class ReturnResponse(BaseModel):
    success: bool
    message: str
    component_name: Optional[str] = None
    quantity_returned: Optional[int] = None


# =====================
# Kiosk Endpoints
# =====================

@router.get("/components", response_model=KioskComponentListResponse)
async def get_available_components(
    search: Optional[str] = None,
    category: Optional[str] = None
):
    """Get all available components for the kiosk display."""
    db = get_database()
    
    query = {"available_quantity": {"$gt": 0}}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.lower()]}}
        ]
    
    if category:
        query["category"] = category
    
    components = await db.components.find(query).sort("name", 1).to_list(length=100)
    
    component_list = [
        KioskComponentResponse(
            id=str(c["_id"]),
            name=c["name"],
            category=c["category"],
            available_quantity=c["available_quantity"],
            total_quantity=c["total_quantity"],
            location=c.get("location"),
            description=c.get("description")
        )
        for c in components
    ]
    
    return KioskComponentListResponse(
        components=component_list,
        total=len(component_list)
    )


@router.get("/categories")
async def get_categories():
    """Get all component categories."""
    db = get_database()
    categories = await db.components.distinct("category")
    return {"categories": categories}


@router.post("/borrow", response_model=BorrowResponse)
async def borrow_component(request: BorrowRequest):
    """
    Borrow a component - No login required.
    Student enters roll number, name, and selects component.
    """
    db = get_database()
    
    # Validate component exists and has stock
    if not ObjectId.is_valid(request.component_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid component ID"
        )
    
    component = await db.components.find_one({"_id": ObjectId(request.component_id)})
    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Component not found"
        )
    
    if component["available_quantity"] < request.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough stock. Available: {component['available_quantity']}"
        )
    
    # Check if student already has this component borrowed
    existing = await db.transactions.find_one({
        "roll_number": request.roll_number.upper(),
        "component_id": request.component_id,
        "status": TransactionStatus.ISSUED.value
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You already have this component borrowed (Qty: {existing['quantity']}). Please return it first."
        )
    
    # Create transaction
    now = datetime.utcnow()
    transaction = {
        "roll_number": request.roll_number.upper(),
        "user_name": request.name.strip(),
        "user_id": f"student_{request.roll_number.upper()}",
        "user_email": f"{request.roll_number.lower()}@student.local",
        "component_id": request.component_id,
        "component_name": component["name"],
        "quantity": request.quantity,
        "purpose": request.purpose,
        "status": TransactionStatus.ISSUED.value,
        "issue_date": now,
        "due_date": now + timedelta(days=7),  # Default 7 day return period
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.transactions.insert_one(transaction)
    
    # Update component quantity
    await db.components.update_one(
        {"_id": ObjectId(request.component_id)},
        {
            "$inc": {"available_quantity": -request.quantity},
            "$set": {"updated_at": now}
        }
    )
    
    return BorrowResponse(
        success=True,
        message=f"Successfully borrowed {request.quantity}x {component['name']}",
        transaction_id=str(result.inserted_id),
        component_name=component["name"],
        quantity=request.quantity
    )


@router.get("/borrowed/{roll_number}", response_model=StudentBorrowedResponse)
async def get_student_borrowed_items(roll_number: str):
    """Get all items currently borrowed by a student."""
    db = get_database()
    
    transactions = await db.transactions.find({
        "roll_number": roll_number.upper(),
        "status": TransactionStatus.ISSUED.value
    }).sort("issue_date", -1).to_list(length=50)
    
    if not transactions:
        return StudentBorrowedResponse(
            roll_number=roll_number.upper(),
            name="",
            items=[],
            total_items=0
        )
    
    # Get component locations
    component_ids = [ObjectId(t["component_id"]) for t in transactions if ObjectId.is_valid(t["component_id"])]
    components = await db.components.find({"_id": {"$in": component_ids}}).to_list(length=50)
    component_map = {str(c["_id"]): c.get("location") for c in components}
    
    items = [
        BorrowedItem(
            transaction_id=str(t["_id"]),
            component_id=t["component_id"],
            component_name=t["component_name"],
            quantity=t["quantity"],
            borrowed_at=t["issue_date"],
            location=component_map.get(t["component_id"])
        )
        for t in transactions
    ]
    
    return StudentBorrowedResponse(
        roll_number=roll_number.upper(),
        name=transactions[0]["user_name"] if transactions else "",
        items=items,
        total_items=len(items)
    )


@router.post("/return", response_model=ReturnResponse)
async def return_component(request: ReturnRequest):
    """Return a borrowed component."""
    db = get_database()
    
    if not ObjectId.is_valid(request.transaction_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction ID"
        )
    
    transaction = await db.transactions.find_one({
        "_id": ObjectId(request.transaction_id),
        "status": TransactionStatus.ISSUED.value
    })
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found or already returned"
        )
    
    now = datetime.utcnow()
    
    # Update transaction
    await db.transactions.update_one(
        {"_id": ObjectId(request.transaction_id)},
        {
            "$set": {
                "status": TransactionStatus.RETURNED.value,
                "return_date": now,
                "return_condition": request.condition,
                "updated_at": now
            }
        }
    )
    
    # Restore component quantity
    await db.components.update_one(
        {"_id": ObjectId(transaction["component_id"])},
        {
            "$inc": {"available_quantity": transaction["quantity"]},
            "$set": {"updated_at": now}
        }
    )
    
    return ReturnResponse(
        success=True,
        message=f"Successfully returned {transaction['quantity']}x {transaction['component_name']}",
        component_name=transaction["component_name"],
        quantity_returned=transaction["quantity"]
    )


@router.get("/search-student")
async def search_student(roll_number: str):
    """Search for a student by roll number to see their borrowed items."""
    db = get_database()
    
    # Get any transaction with this roll number
    transaction = await db.transactions.find_one({
        "roll_number": roll_number.upper()
    })
    
    if transaction:
        return {
            "found": True,
            "roll_number": roll_number.upper(),
            "name": transaction["user_name"]
        }
    
    return {
        "found": False,
        "roll_number": roll_number.upper(),
        "name": None
    }


@router.get("/stats")
async def get_kiosk_stats():
    """Get quick stats for the kiosk display."""
    db = get_database()
    
    # Total components
    total_components = await db.components.count_documents({})
    
    # Available components (with stock)
    available_components = await db.components.count_documents({"available_quantity": {"$gt": 0}})
    
    # Active borrows
    active_borrows = await db.transactions.count_documents({"status": TransactionStatus.ISSUED.value})
    
    # Overdue items
    overdue = await db.transactions.count_documents({
        "status": TransactionStatus.ISSUED.value,
        "due_date": {"$lt": datetime.utcnow()}
    })
    
    # Recent activity (last 10 transactions)
    recent = await db.transactions.find().sort("created_at", -1).limit(10).to_list(length=10)
    recent_activity = [
        {
            "type": "return" if t["status"] == TransactionStatus.RETURNED.value else "borrow",
            "component": t["component_name"],
            "student": t["user_name"],
            "roll_number": t.get("roll_number", "N/A"),
            "time": t["updated_at"].isoformat() if t.get("updated_at") else t["created_at"].isoformat()
        }
        for t in recent
    ]
    
    return {
        "total_components": total_components,
        "available_components": available_components,
        "active_borrows": active_borrows,
        "overdue_items": overdue,
        "recent_activity": recent_activity
    }

