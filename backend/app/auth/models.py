"""
Authentication-related Pydantic models
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TokenData(BaseModel):
    """Token data model for JWT tokens"""
    user_id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    exp: Optional[datetime] = None


class UserAuth(BaseModel):
    """User authentication model"""
    user_id: str = Field(..., description="User's unique identifier")
    email: str = Field(..., description="User's email address")
    username: Optional[str] = Field(None, description="User's display name")
    is_active: bool = Field(True, description="Whether user account is active")
    is_verified: bool = Field(False, description="Whether user email is verified")
    created_at: datetime = Field(..., description="Account creation timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")


class LoginRequest(BaseModel):
    """Login request model"""
    email: str = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, description="User's password")


class RegisterRequest(BaseModel):
    """Registration request model"""
    email: str = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, description="User's password")
    username: Optional[str] = Field(None, min_length=2, max_length=50, description="User's display name")


class TokenResponse(BaseModel):
    """Token response model"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiry time in seconds")


class PasswordResetRequest(BaseModel):
    """Password reset request model"""
    email: str = Field(..., description="User's email address")


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation model"""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")


class PasswordChangeRequest(BaseModel):
    """Password change request model"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")