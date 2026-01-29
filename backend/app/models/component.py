from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ComponentStatus(str, Enum):
    AVAILABLE = "available"
    ISSUED = "issued"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"


class ComponentCategory(str, Enum):
    MICROCONTROLLER = "microcontroller"
    SENSOR = "sensor"
    ACTUATOR = "actuator"
    DISPLAY = "display"
    COMMUNICATION = "communication"
    POWER = "power"
    CONNECTOR = "connector"
    OTHER = "other"


class ComponentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: ComponentCategory
    total_quantity: int = Field(..., ge=0)
    available_quantity: int = Field(..., ge=0)
    location: Optional[str] = None
    specifications: Optional[dict] = None
    image_url: Optional[str] = None
    tags: List[str] = []


class ComponentCreate(ComponentBase):
    pass


class ComponentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[ComponentCategory] = None
    total_quantity: Optional[int] = Field(None, ge=0)
    available_quantity: Optional[int] = Field(None, ge=0)
    location: Optional[str] = None
    specifications: Optional[dict] = None
    image_url: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[ComponentStatus] = None


class ComponentInDB(ComponentBase):
    id: str = Field(alias="_id")
    status: ComponentStatus = ComponentStatus.AVAILABLE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

    class Config:
        populate_by_name = True


class ComponentResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: ComponentCategory
    total_quantity: int
    available_quantity: int
    status: ComponentStatus
    location: Optional[str] = None
    specifications: Optional[dict] = None
    image_url: Optional[str] = None
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComponentListResponse(BaseModel):
    components: List[ComponentResponse]
    total: int
    page: int
    page_size: int
