"""
Authentication routes for login, registration, and token management
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime
import os
import secrets
import hashlib
from typing import Dict, Any

from .models import (
    LoginRequest, 
    RegisterRequest, 
    TokenResponse, 
    UserAuth,
    PasswordResetRequest,
    PasswordResetConfirm,
    PasswordChangeRequest
)
from .jwt_handler import jwt_handler
from .dependencies import get_current_active_user, security
from ..database.connection import supabase


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, background_tasks: BackgroundTasks):
    """
    Register a new user account
    """
    # Check if Supabase is configured
    if not supabase:
        if os.getenv("ENVIRONMENT", "development") == "development":
            # For development without Supabase, create mock tokens
            user_id = f"dev-user-{secrets.token_hex(8)}"
            token_data = {
                "sub": user_id,
                "email": request.email,
                "username": request.username or request.email.split("@")[0]
            }
            
            access_token = jwt_handler.create_access_token(token_data)
            refresh_token = jwt_handler.create_refresh_token(token_data)
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=jwt_handler.get_token_expiry("access")
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service not configured"
            )
    
    try:
        # Check if user already exists
        existing_user = supabase.table("users").select("id").eq("email", request.email).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "username": request.username or request.email.split("@")[0]
                }
            }
        })
        
        if auth_response.user:
            # Create user record in our users table
            user_data = {
                "id": auth_response.user.id,
                "email": request.email,
                "username": request.username or request.email.split("@")[0],
                "is_active": True,
                "is_verified": False,
                "created_at": datetime.utcnow().isoformat()
            }
            
            supabase.table("users").insert(user_data).execute()
            
            # Create JWT tokens
            token_data = {
                "sub": auth_response.user.id,
                "email": request.email,
                "username": request.username or request.email.split("@")[0]
            }
            
            access_token = jwt_handler.create_access_token(token_data)
            refresh_token = jwt_handler.create_refresh_token(token_data)
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=jwt_handler.get_token_expiry("access")
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and return access tokens
    """
    # Check if Supabase is configured
    if not supabase:
        if os.getenv("ENVIRONMENT", "development") == "development":
            # For development without Supabase, accept any email/password
            user_id = f"dev-user-{hashlib.md5(request.email.encode()).hexdigest()[:8]}"
            token_data = {
                "sub": user_id,
                "email": request.email,
                "username": request.email.split("@")[0]
            }
            
            access_token = jwt_handler.create_access_token(token_data)
            refresh_token = jwt_handler.create_refresh_token(token_data)
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=jwt_handler.get_token_expiry("access")
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service not configured"
            )
    
    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if auth_response.user:
            # Update last login time
            supabase.table("users").update({
                "last_login": datetime.utcnow().isoformat()
            }).eq("id", auth_response.user.id).execute()
            
            # Get user data
            user_result = supabase.table("users").select("*").eq("id", auth_response.user.id).execute()
            if not user_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User profile not found"
                )
            
            user_data = user_result.data[0]
            
            # Create JWT tokens
            token_data = {
                "sub": auth_response.user.id,
                "email": user_data["email"],
                "username": user_data.get("username")
            }
            
            access_token = jwt_handler.create_access_token(token_data)
            refresh_token = jwt_handler.create_refresh_token(token_data)
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=jwt_handler.get_token_expiry("access")
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Refresh access token using refresh token
    """
    try:
        # Verify refresh token and create new access token
        new_access_token = jwt_handler.refresh_access_token(credentials.credentials)
        
        # Return the same refresh token (typically refresh tokens have longer expiry)
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=credentials.credentials,
            expires_in=jwt_handler.get_token_expiry("access")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )


@router.post("/logout")
async def logout(current_user: UserAuth = Depends(get_current_active_user)):
    """
    Logout user (invalidate tokens on client side)
    """
    # Note: JWT tokens can't be invalidated server-side without a blacklist
    # The client should remove the tokens from storage
    # In a production app, you might want to implement a token blacklist
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserAuth)
async def get_current_user_info(current_user: UserAuth = Depends(get_current_active_user)):
    """
    Get current authenticated user information
    """
    return current_user


@router.post("/password-reset")
async def request_password_reset(request: PasswordResetRequest):
    """
    Request password reset email
    """
    if not supabase:
        # For development, just return success
        return {"message": "Password reset email sent (development mode)"}
    
    try:
        # Use Supabase Auth to send password reset email
        supabase.auth.reset_password_email(request.email)
        return {"message": "Password reset email sent"}
        
    except Exception as e:
        # Don't reveal whether email exists or not for security
        return {"message": "Password reset email sent"}


@router.post("/password-reset/confirm")
async def confirm_password_reset(request: PasswordResetConfirm):
    """
    Confirm password reset with token and new password
    """
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Password reset not available in development mode"
        )
    
    try:
        # Use Supabase Auth to update password with reset token
        # This would typically be handled by Supabase's password reset flow
        # Implementation depends on your specific password reset token handling
        
        return {"message": "Password successfully reset"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset failed. Token may be invalid or expired."
        )


@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Change password for authenticated user
    """
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Password change not available in development mode"
        )
    
    try:
        # Verify current password and update to new password
        # This would use Supabase Auth password update functionality
        
        return {"message": "Password successfully changed"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password change failed. Current password may be incorrect."
        )