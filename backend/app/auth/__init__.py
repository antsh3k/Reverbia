"""
Authentication module for Reverbia
Handles JWT tokens, user sessions, and protected routes
"""

from .dependencies import get_current_user, get_current_active_user
from .middleware import AuthMiddleware
from .jwt_handler import JWTHandler
from .models import TokenData, UserAuth

__all__ = [
    "get_current_user",
    "get_current_active_user", 
    "AuthMiddleware",
    "JWTHandler",
    "TokenData",
    "UserAuth"
]