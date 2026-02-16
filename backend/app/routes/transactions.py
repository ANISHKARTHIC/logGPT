from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
from ..database import get_database
from ..models import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionListResponse,
    TransactionStatus,
    UserResponse,
    UserRole
)
from ..auth import get_current_user, get_current_admin

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[TransactionStatus] = None,
    user_id: Optional[str] = None,
    component_id: Optional[str] = None,
    overdue_only: bool = False,
    current_user: UserResponse = Depends(get_current_user)
):
    """List transactions. Students see only their own, admins see all."""
    db = get_database()
    
    # Build query filter
    query = {}
    
    # Students can only see their own transactions
    if current_user.role == UserRole.STUDENT:
        query["user_id"] = current_user.id
    elif user_id:
        query["user_id"] = user_id
    
    if status:
        query["status"] = status.value
    if component_id:
        query["component_id"] = component_id
    if overdue_only:
        query["due_date"] = {"$lt": datetime.utcnow()}
        query["status"] = TransactionStatus.ISSUED.value
    
    # Get total count
    total = await db.transactions.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * page_size
    cursor = db.transactions.find(query).skip(skip).limit(page_size).sort("created_at", -1)
    transactions = await cursor.to_list(length=page_size)
    
    # Transform to response
    transaction_list = [
        TransactionResponse(
            id=str(t["_id"]),
            component_id=t["component_id"],
            component_name=t["component_name"],
            user_id=t["user_id"],
            user_name=t["user_name"],
            user_email=t["user_email"],
            quantity=t["quantity"],
            purpose=t.get("purpose"),
            status=TransactionStatus(t["status"]),
            issue_date=t.get("issue_date"),
            due_date=t.get("due_date"),
            return_date=t.get("return_date"),
            return_condition=t.get("return_condition"),
            admin_notes=t.get("admin_notes"),
            created_at=t["created_at"],
            updated_at=t["updated_at"]
        )
        for t in transactions
    ]
    
    return TransactionListResponse(
        transactions=transaction_list,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/overdue", response_model=TransactionListResponse)
async def get_overdue_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_admin)
):
    """Get all overdue transactions (Admin only)."""
    db = get_database()
    
    query = {
        "due_date": {"$lt": datetime.utcnow()},
        "status": TransactionStatus.ISSUED.value
    }
    
    # Update status to overdue
    await db.transactions.update_many(
        query,
        {"$set": {"status": TransactionStatus.OVERDUE.value, "updated_at": datetime.utcnow()}}
    )
    
    query["status"] = TransactionStatus.OVERDUE.value
    
    total = await db.transactions.count_documents(query)
    skip = (page - 1) * page_size
    cursor = db.transactions.find(query).skip(skip).limit(page_size).sort("due_date", 1)
    transactions = await cursor.to_list(length=page_size)
    
    transaction_list = [
        TransactionResponse(
            id=str(t["_id"]),
            component_id=t["component_id"],
            component_name=t["component_name"],
            user_id=t["user_id"],
            user_name=t["user_name"],
            user_email=t["user_email"],
            quantity=t["quantity"],
            purpose=t.get("purpose"),
            status=TransactionStatus(t["status"]),
            issue_date=t.get("issue_date"),
            due_date=t.get("due_date"),
            return_date=t.get("return_date"),
            return_condition=t.get("return_condition"),
            admin_notes=t.get("admin_notes"),
            created_at=t["created_at"],
            updated_at=t["updated_at"]
        )
        for t in transactions
    ]
    
    return TransactionListResponse(
        transactions=transaction_list,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific transaction."""
    db = get_database()
    
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction ID"
        )
    
    transaction = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Students can only view their own transactions
    if current_user.role == UserRole.STUDENT and transaction["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return TransactionResponse(
        id=str(transaction["_id"]),
        component_id=transaction["component_id"],
        component_name=transaction["component_name"],
        user_id=transaction["user_id"],
        user_name=transaction["user_name"],
        user_email=transaction["user_email"],
        quantity=transaction["quantity"],
        purpose=transaction.get("purpose"),
        status=TransactionStatus(transaction["status"]),
        issue_date=transaction.get("issue_date"),
        due_date=transaction.get("due_date"),
        return_date=transaction.get("return_date"),
        return_condition=transaction.get("return_condition"),
        admin_notes=transaction.get("admin_notes"),
        created_at=transaction["created_at"],
        updated_at=transaction["updated_at"]
    )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a new component request/transaction."""
    db = get_database()
    
    # Validate component exists and has availability
    if not ObjectId.is_valid(transaction_data.component_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid component ID"
        )
    
    component = await db.components.find_one({"_id": ObjectId(transaction_data.component_id)})
    
    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Component not found"
        )
    
    if component["available_quantity"] < transaction_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient quantity. Only {component['available_quantity']} available."
        )
    
    # Create transaction
    transaction_doc = {
        "component_id": transaction_data.component_id,
        "component_name": component["name"],
        "user_id": current_user.id,
        "user_name": current_user.name,
        "user_email": current_user.email,
        "quantity": transaction_data.quantity,
        "purpose": transaction_data.purpose,
        "status": TransactionStatus.PENDING.value,
        "expected_return_date": transaction_data.expected_return_date,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.transactions.insert_one(transaction_doc)
    
    return TransactionResponse(
        id=str(result.inserted_id),
        component_id=transaction_doc["component_id"],
        component_name=transaction_doc["component_name"],
        user_id=transaction_doc["user_id"],
        user_name=transaction_doc["user_name"],
        user_email=transaction_doc["user_email"],
        quantity=transaction_doc["quantity"],
        purpose=transaction_doc["purpose"],
        status=TransactionStatus.PENDING,
        issue_date=None,
        due_date=None,
        return_date=None,
        return_condition=None,
        admin_notes=None,
        created_at=transaction_doc["created_at"],
        updated_at=transaction_doc["updated_at"]
    )


@router.patch("/{transaction_id}/approve", response_model=TransactionResponse)
async def approve_transaction(
    transaction_id: str,
    due_days: int = Query(7, ge=1, le=90),
    current_user: UserResponse = Depends(get_current_admin)
):
    """Approve a pending transaction (Admin only)."""
    db = get_database()
    
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction ID"
        )
    
    transaction = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    if transaction["status"] != TransactionStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending transactions can be approved"
        )
    
    # Check component availability
    component = await db.components.find_one({"_id": ObjectId(transaction["component_id"])})
    
    if component["available_quantity"] < transaction["quantity"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient component quantity"
        )
    
    now = datetime.utcnow()
    due_date = now + timedelta(days=due_days)
    
    # Update transaction
    update_doc = {
        "status": TransactionStatus.ISSUED.value,
        "issue_date": now,
        "due_date": due_date,
        "approved_by": current_user.id,
        "updated_at": now
    }
    
    await db.transactions.update_one(
        {"_id": ObjectId(transaction_id)},
        {"$set": update_doc}
    )
    
    # Update component availability
    await db.components.update_one(
        {"_id": ObjectId(transaction["component_id"])},
        {"$inc": {"available_quantity": -transaction["quantity"]}}
    )
    
    updated = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    
    return TransactionResponse(
        id=str(updated["_id"]),
        component_id=updated["component_id"],
        component_name=updated["component_name"],
        user_id=updated["user_id"],
        user_name=updated["user_name"],
        user_email=updated["user_email"],
        quantity=updated["quantity"],
        purpose=updated.get("purpose"),
        status=TransactionStatus(updated["status"]),
        issue_date=updated.get("issue_date"),
        due_date=updated.get("due_date"),
        return_date=updated.get("return_date"),
        return_condition=updated.get("return_condition"),
        admin_notes=updated.get("admin_notes"),
        created_at=updated["created_at"],
        updated_at=updated["updated_at"]
    )


@router.patch("/{transaction_id}/reject", response_model=TransactionResponse)
async def reject_transaction(
    transaction_id: str,
    reason: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_admin)
):
    """Reject a pending transaction (Admin only)."""
    db = get_database()
    
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction ID"
        )
    
    transaction = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    if transaction["status"] != TransactionStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending transactions can be rejected"
        )
    
    update_doc = {
        "status": TransactionStatus.REJECTED.value,
        "admin_notes": reason,
        "updated_at": datetime.utcnow()
    }
    
    await db.transactions.update_one(
        {"_id": ObjectId(transaction_id)},
        {"$set": update_doc}
    )
    
    updated = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    
    return TransactionResponse(
        id=str(updated["_id"]),
        component_id=updated["component_id"],
        component_name=updated["component_name"],
        user_id=updated["user_id"],
        user_name=updated["user_name"],
        user_email=updated["user_email"],
        quantity=updated["quantity"],
        purpose=updated.get("purpose"),
        status=TransactionStatus(updated["status"]),
        issue_date=updated.get("issue_date"),
        due_date=updated.get("due_date"),
        return_date=updated.get("return_date"),
        return_condition=updated.get("return_condition"),
        admin_notes=updated.get("admin_notes"),
        created_at=updated["created_at"],
        updated_at=updated["updated_at"]
    )


@router.patch("/{transaction_id}/return", response_model=TransactionResponse)
async def return_component(
    transaction_id: str,
    condition: str = Query(..., min_length=1),
    current_user: UserResponse = Depends(get_current_admin)
):
    """Mark a component as returned (Admin only)."""
    db = get_database()
    
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction ID"
        )
    
    transaction = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    if transaction["status"] not in [TransactionStatus.ISSUED.value, TransactionStatus.OVERDUE.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only issued or overdue components can be returned"
        )
    
    now = datetime.utcnow()
    
    update_doc = {
        "status": TransactionStatus.RETURNED.value,
        "return_date": now,
        "return_condition": condition,
        "updated_at": now
    }
    
    await db.transactions.update_one(
        {"_id": ObjectId(transaction_id)},
        {"$set": update_doc}
    )
    
    # Update component availability
    await db.components.update_one(
        {"_id": ObjectId(transaction["component_id"])},
        {"$inc": {"available_quantity": transaction["quantity"]}}
    )
    
    updated = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    
    return TransactionResponse(
        id=str(updated["_id"]),
        component_id=updated["component_id"],
        component_name=updated["component_name"],
        user_id=updated["user_id"],
        user_name=updated["user_name"],
        user_email=updated["user_email"],
        quantity=updated["quantity"],
        purpose=updated.get("purpose"),
        status=TransactionStatus(updated["status"]),
        issue_date=updated.get("issue_date"),
        due_date=updated.get("due_date"),
        return_date=updated.get("return_date"),
        return_condition=updated.get("return_condition"),
        admin_notes=updated.get("admin_notes"),
        created_at=updated["created_at"],
        updated_at=updated["updated_at"]
    )
