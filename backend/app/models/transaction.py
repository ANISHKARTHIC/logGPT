from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TransactionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ISSUED = "issued"
    RETURNED = "returned"
    OVERDUE = "overdue"
    REJECTED = "rejected"


class TransactionBase(BaseModel):
    component_id: str
    quantity: int = Field(..., ge=1)
    purpose: Optional[str] = None
    expected_return_date: Optional[datetime] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    status: Optional[TransactionStatus] = None
    return_date: Optional[datetime] = None
    return_condition: Optional[str] = None
    admin_notes: Optional[str] = None


class TransactionInDB(TransactionBase):
    id: str = Field(alias="_id")
    user_id: str
    user_name: str
    user_email: str
    component_name: str
    status: TransactionStatus = TransactionStatus.PENDING
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    return_condition: Optional[str] = None
    approved_by: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class TransactionResponse(BaseModel):
    id: str
    component_id: str
    component_name: str
    user_id: str
    user_name: str
    user_email: str
    quantity: int
    purpose: Optional[str] = None
    status: TransactionStatus
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    return_condition: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int
    page: int
    page_size: int
