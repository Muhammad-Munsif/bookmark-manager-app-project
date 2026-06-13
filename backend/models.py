# backend/models.py
from pydantic import BaseModel, Field, HttpUrl, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# Enums
class Category(str, Enum):
    WORK = "work"
    PERSONAL = "personal"
    LEARNING = "learning"
    ENTERTAINMENT = "entertainment"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

# User Models
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    email: Optional[EmailStr] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str]
    created_at: datetime
    preferences: dict
    
    class Config:
        json_encoders = {ObjectId: str}

# Bookmark Models
class BookmarkCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    url: HttpUrl
    category: Category = Category.PERSONAL
    priority: Priority = Priority.MEDIUM
    description: Optional[str] = Field(None, max_length=500)
    tags: List[str] = []

class BookmarkUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    url: Optional[HttpUrl] = None
    category: Optional[Category] = None
    priority: Optional[Priority] = None
    description: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    is_archived: Optional[bool] = None

class BookmarkResponse(BaseModel):
    id: str
    title: str
    url: str
    category: str
    priority: str
    description: Optional[str]
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    clicks: int
    
    class Config:
        json_encoders = {ObjectId: str}

class BookmarkInDB(BookmarkCreate):
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    clicks: int = 0
    is_archived: bool = False