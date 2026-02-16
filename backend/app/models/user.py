from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId


class UserRole(str, Enum):
    ADMIN = "admin"
    STUDENT = "student"


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    role: UserRole = UserRole.STUDENT
    department: Optional[str] = None
    student_id: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    department: Optional[str] = None
    student_id: Optional[str] = None


class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: UserRole
    department: Optional[str] = None
    student_id: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefresh(BaseModel):
    refresh_token: str
