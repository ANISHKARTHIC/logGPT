from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..models import (
    ComponentCreate,
    ComponentUpdate,
    ComponentResponse,
    ComponentListResponse,
    ComponentStatus,
    ComponentCategory,
    UserResponse
)
from ..auth import get_current_user, get_current_admin

router = APIRouter(prefix="/components", tags=["Components"])


@router.get("", response_model=ComponentListResponse)
async def list_components(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[ComponentCategory] = None,
    status: Optional[ComponentStatus] = None,
    search: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """List all components with optional filtering."""
    db = get_database()
    
    # Build query filter
    query = {}
    if category:
        query["category"] = category.value
    if status:
        query["status"] = status.value
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.lower()]}}
        ]
    
    # Get total count
    total = await db.components.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * page_size
    cursor = db.components.find(query).skip(skip).limit(page_size).sort("name", 1)
    components = await cursor.to_list(length=page_size)
    
    # Transform to response
    component_list = [
        ComponentResponse(
            id=str(c["_id"]),
            name=c["name"],
            description=c.get("description"),
            category=ComponentCategory(c["category"]),
            total_quantity=c["total_quantity"],
            available_quantity=c["available_quantity"],
            status=ComponentStatus(c.get("status", "available")),
            location=c.get("location"),
            specifications=c.get("specifications"),
            image_url=c.get("image_url"),
            tags=c.get("tags", []),
            created_at=c["created_at"],
            updated_at=c["updated_at"]
        )
        for c in components
    ]
    
    return ComponentListResponse(
        components=component_list,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{component_id}", response_model=ComponentResponse)
async def get_component(
    component_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific component by ID."""
    db = get_database()
    
    if not ObjectId.is_valid(component_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid component ID"
        )
    
    component = await db.components.find_one({"_id": ObjectId(component_id)})
    
    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Component not found"
        )
    
    return ComponentResponse(
        id=str(component["_id"]),
        name=component["name"],
        description=component.get("description"),
        category=ComponentCategory(component["category"]),
        total_quantity=component["total_quantity"],
        available_quantity=component["available_quantity"],
        status=ComponentStatus(component.get("status", "available")),
        location=component.get("location"),
        specifications=component.get("specifications"),
        image_url=component.get("image_url"),
        tags=component.get("tags", []),
        created_at=component["created_at"],
        updated_at=component["updated_at"]
    )


@router.post("", response_model=ComponentResponse, status_code=status.HTTP_201_CREATED)
async def create_component(
    component_data: ComponentCreate,
    current_user: UserResponse = Depends(get_current_admin)
):
    """Create a new component (Admin only)."""
    db = get_database()
    
    # Determine initial status
    initial_status = ComponentStatus.AVAILABLE if component_data.available_quantity > 0 else ComponentStatus.ISSUED
    
    component_doc = {
        "name": component_data.name,
        "description": component_data.description,
        "category": component_data.category.value,
        "total_quantity": component_data.total_quantity,
        "available_quantity": component_data.available_quantity,
        "status": initial_status.value,
        "location": component_data.location,
        "specifications": component_data.specifications,
        "image_url": component_data.image_url,
        "tags": [tag.lower() for tag in component_data.tags],
        "created_by": current_user.id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.components.insert_one(component_doc)
    
    return ComponentResponse(
        id=str(result.inserted_id),
        name=component_doc["name"],
        description=component_doc["description"],
        category=component_data.category,
        total_quantity=component_doc["total_quantity"],
        available_quantity=component_doc["available_quantity"],
        status=initial_status,
        location=component_doc["location"],
        specifications=component_doc["specifications"],
        image_url=component_doc["image_url"],
        tags=component_doc["tags"],
        created_at=component_doc["created_at"],
        updated_at=component_doc["updated_at"]
    )


@router.patch("/{component_id}", response_model=ComponentResponse)
async def update_component(
    component_id: str,
    component_data: ComponentUpdate,
    current_user: UserResponse = Depends(get_current_admin)
):
    """Update a component (Admin only)."""
    db = get_database()
    
    if not ObjectId.is_valid(component_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid component ID"
        )
    
    # Build update document
    update_doc = {"updated_at": datetime.utcnow()}
    update_data = component_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            if key == "category":
                update_doc[key] = value.value
            elif key == "status":
                update_doc[key] = value.value
            elif key == "tags":
                update_doc[key] = [tag.lower() for tag in value]
            else:
                update_doc[key] = value
    
    result = await db.components.find_one_and_update(
        {"_id": ObjectId(component_id)},
        {"$set": update_doc},
        return_document=True
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Component not found"
        )
    
    return ComponentResponse(
        id=str(result["_id"]),
        name=result["name"],
        description=result.get("description"),
        category=ComponentCategory(result["category"]),
        total_quantity=result["total_quantity"],
        available_quantity=result["available_quantity"],
        status=ComponentStatus(result.get("status", "available")),
        location=result.get("location"),
        specifications=result.get("specifications"),
        image_url=result.get("image_url"),
        tags=result.get("tags", []),
        created_at=result["created_at"],
        updated_at=result["updated_at"]
    )


@router.delete("/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_component(
    component_id: str,
    current_user: UserResponse = Depends(get_current_admin)
):
    """Delete a component (Admin only)."""
    db = get_database()
    
    if not ObjectId.is_valid(component_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid component ID"
        )
    
    # Check for active transactions
    active_transaction = await db.transactions.find_one({
        "component_id": component_id,
        "status": {"$in": ["pending", "approved", "issued"]}
    })
    
    if active_transaction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete component with active transactions"
        )
    
    result = await db.components.delete_one({"_id": ObjectId(component_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Component not found"
        )


@router.get("/categories/all", response_model=List[dict])
async def get_categories(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get all component categories with counts."""
    db = get_database()
    
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.components.aggregate(pipeline).to_list(length=None)
    
    return [{"category": r["_id"], "count": r["count"]} for r in results]
