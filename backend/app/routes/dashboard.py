from fastapi import APIRouter, Depends
from typing import List
from datetime import datetime, timedelta
from bson import ObjectId
from ..database import get_database
from ..models import UserResponse, UserRole, TransactionStatus
from ..auth import get_current_user, get_current_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get dashboard statistics based on user role."""
    db = get_database()
    
    if current_user.role == UserRole.ADMIN:
        return await get_admin_stats(db)
    else:
        return await get_student_stats(db, current_user.id)


async def get_admin_stats(db):
    """Get admin dashboard statistics."""
    now = datetime.utcnow()
    
    # Total components
    total_components = await db.components.count_documents({})
    
    # Low stock components (available < 20% of total)
    low_stock_pipeline = [
        {
            "$match": {
                "$expr": {
                    "$lt": ["$available_quantity", {"$multiply": ["$total_quantity", 0.2]}]
                }
            }
        },
        {"$count": "count"}
    ]
    low_stock_result = await db.components.aggregate(low_stock_pipeline).to_list(1)
    low_stock = low_stock_result[0]["count"] if low_stock_result else 0
    
    # Active transactions
    active_transactions = await db.transactions.count_documents({
        "status": {"$in": [
            TransactionStatus.PENDING.value,
            TransactionStatus.ISSUED.value
        ]}
    })
    
    # Pending requests
    pending_requests = await db.transactions.count_documents({
        "status": TransactionStatus.PENDING.value
    })
    
    # Overdue items
    overdue_count = await db.transactions.count_documents({
        "status": {"$in": [TransactionStatus.ISSUED.value, TransactionStatus.OVERDUE.value]},
        "due_date": {"$lt": now}
    })
    
    # Total users
    total_users = await db.users.count_documents({})
    
    # Recent activity (last 7 days)
    week_ago = now - timedelta(days=7)
    recent_transactions = await db.transactions.count_documents({
        "created_at": {"$gte": week_ago}
    })
    
    # Top borrowed components
    top_components_pipeline = [
        {"$match": {"status": {"$in": [
            TransactionStatus.ISSUED.value,
            TransactionStatus.RETURNED.value
        ]}}},
        {"$group": {"_id": "$component_name", "count": {"$sum": "$quantity"}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_components = await db.transactions.aggregate(top_components_pipeline).to_list(5)
    
    # Category distribution
    category_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    categories = await db.components.aggregate(category_pipeline).to_list(10)
    
    return {
        "total_components": total_components,
        "low_stock": low_stock,
        "active_transactions": active_transactions,
        "pending_requests": pending_requests,
        "overdue_count": overdue_count,
        "total_users": total_users,
        "recent_transactions": recent_transactions,
        "top_components": [{"name": c["_id"], "count": c["count"]} for c in top_components],
        "categories": [{"name": c["_id"], "count": c["count"]} for c in categories]
    }


async def get_student_stats(db, user_id: str):
    """Get student dashboard statistics."""
    now = datetime.utcnow()
    
    # My active issues
    active_issues = await db.transactions.count_documents({
        "user_id": user_id,
        "status": {"$in": [
            TransactionStatus.ISSUED.value,
            TransactionStatus.APPROVED.value
        ]}
    })
    
    # My pending requests
    pending_requests = await db.transactions.count_documents({
        "user_id": user_id,
        "status": TransactionStatus.PENDING.value
    })
    
    # My overdue items
    overdue_count = await db.transactions.count_documents({
        "user_id": user_id,
        "status": {"$in": [TransactionStatus.ISSUED.value, TransactionStatus.OVERDUE.value]},
        "due_date": {"$lt": now}
    })
    
    # Total returns
    total_returns = await db.transactions.count_documents({
        "user_id": user_id,
        "status": TransactionStatus.RETURNED.value
    })
    
    # Recent transactions
    recent = await db.transactions.find({
        "user_id": user_id
    }).sort("created_at", -1).limit(5).to_list(5)
    
    recent_transactions = [
        {
            "id": str(t["_id"]),
            "component": t["component_name"],
            "quantity": t["quantity"],
            "status": t["status"],
            "date": t["created_at"].isoformat()
        }
        for t in recent
    ]
    
    # Available components count
    available_components = await db.components.count_documents({
        "available_quantity": {"$gt": 0}
    })
    
    return {
        "active_issues": active_issues,
        "pending_requests": pending_requests,
        "overdue_count": overdue_count,
        "total_returns": total_returns,
        "recent_transactions": recent_transactions,
        "available_components": available_components
    }


@router.get("/recent-activity")
async def get_recent_activity(
    current_user: UserResponse = Depends(get_current_admin)
):
    """Get recent activity feed (Admin only)."""
    db = get_database()
    
    # Get recent transactions
    transactions = await db.transactions.find().sort("updated_at", -1).limit(20).to_list(20)
    
    activity = []
    for t in transactions:
        action = get_action_text(t["status"])
        activity.append({
            "id": str(t["_id"]),
            "type": "transaction",
            "action": action,
            "user": t["user_name"],
            "component": t["component_name"],
            "quantity": t["quantity"],
            "status": t["status"],
            "timestamp": t["updated_at"].isoformat()
        })
    
    return {"activity": activity}


def get_action_text(status: str) -> str:
    """Get human-readable action text for status."""
    actions = {
        TransactionStatus.PENDING.value: "requested",
        TransactionStatus.APPROVED.value: "approved for",
        TransactionStatus.ISSUED.value: "issued",
        TransactionStatus.RETURNED.value: "returned",
        TransactionStatus.OVERDUE.value: "overdue on",
        TransactionStatus.REJECTED.value: "rejected for"
    }
    return actions.get(status, status)


@router.get("/users")
async def list_users(
    current_user: UserResponse = Depends(get_current_admin)
):
    """List all users (Admin only)."""
    db = get_database()
    
    users = await db.users.find().sort("created_at", -1).to_list(100)
    
    user_list = []
    for u in users:
        # Get user's active transaction count
        active_count = await db.transactions.count_documents({
            "user_id": str(u["_id"]),
            "status": {"$in": [
                TransactionStatus.ISSUED.value,
                TransactionStatus.OVERDUE.value
            ]}
        })
        
        user_list.append({
            "id": str(u["_id"]),
            "email": u["email"],
            "name": u["name"],
            "role": u["role"],
            "department": u.get("department"),
            "student_id": u.get("student_id"),
            "is_active": u.get("is_active", True),
            "active_issues": active_count,
            "created_at": u["created_at"].isoformat()
        })
    
    return {"users": user_list}
