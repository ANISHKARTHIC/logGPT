from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    kiosk_mode: Optional[bool] = False


class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    suggestions: List[str] = []


class ConversationInDB(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    title: Optional[str] = None
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class ConversationResponse(BaseModel):
    id: str
    title: Optional[str] = None
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
    total: int
