"""
User model for Reverbia application
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from .base import BaseDBModel


class UserBase(BaseModel):
    """Base user model with common fields"""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    is_active: bool = True
    is_verified: bool = False


class UserCreate(UserBase):
    """Model for user creation"""
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Model for user updates"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class UserInDB(BaseDBModel, UserBase):
    """User model as stored in database"""
    hashed_password: str
    
    model_config = ConfigDict(from_attributes=True)


class User(BaseDBModel, UserBase):
    """User model for API responses (excludes password)"""
    
    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    """Extended user profile information"""
    bio: Optional[str] = Field(None, max_length=500)
    company: Optional[str] = Field(None, max_length=100)
    job_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    timezone: str = Field(default="UTC", max_length=50)
    preferences: Optional[dict] = Field(default_factory=dict)