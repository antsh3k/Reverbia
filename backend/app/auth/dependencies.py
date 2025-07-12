"""
Authentication dependencies for FastAPI routes
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.security.utils import get_authorization_scheme_param
from typing import Optional
import os

from .jwt_handler import jwt_handler
from .models import TokenData, UserAuth
from ..database.connection import supabase
from datetime import datetime


security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> UserAuth:
    """
    Get the current authenticated user from JWT token
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication credentials provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify the token
    token_data = jwt_handler.verify_token(credentials.credentials)
    
    # Check if Supabase is configured
    if not supabase:
        # For development without Supabase, return mock user
        if os.getenv("ENVIRONMENT", "development") == "development":
            return UserAuth(
                user_id=token_data.user_id or "dev-user-123",
                email=token_data.email or "dev@example.com",
                username=token_data.username or "Development User",
                is_active=True,
                is_verified=True,
                created_at=token_data.exp or datetime.utcnow(),
                last_login=datetime.utcnow()
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service not configured"
            )
    
    # Get user from Supabase
    try:
        result = supabase.table("users").select("*").eq("id", token_data.user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_data = result.data[0]
        return UserAuth(
            user_id=user_data["id"],
            email=user_data["email"],
            username=user_data.get("username"),
            is_active=user_data.get("is_active", True),
            is_verified=user_data.get("is_verified", False),
            created_at=user_data["created_at"],
            last_login=user_data.get("last_login")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user: {str(e)}"
        )


async def get_current_active_user(current_user: UserAuth = Depends(get_current_user)) -> UserAuth:
    """
    Get the current authenticated and active user
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    return current_user


async def get_current_verified_user(current_user: UserAuth = Depends(get_current_active_user)) -> UserAuth:
    """
    Get the current authenticated, active, and verified user
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified. Please verify your email address."
        )
    return current_user


def require_admin(current_user: UserAuth = Depends(get_current_active_user)):
    """
    Dependency that requires admin role
    """
    # This is a placeholder - implement role-based access control as needed
    # For now, we'll check if user has admin email or specific user ID
    admin_emails = os.getenv("ADMIN_EMAILS", "").split(",")
    
    if current_user.email not in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user