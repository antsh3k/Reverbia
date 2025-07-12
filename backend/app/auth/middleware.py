"""
Authentication middleware for FastAPI
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import re
import os

from .jwt_handler import jwt_handler


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle authentication for protected routes
    """
    
    def __init__(self, app, excluded_paths=None):
        super().__init__(app)
        
        # Default excluded paths (don't require authentication)
        self.excluded_paths = excluded_paths or [
            "/",
            "/health",
            "/health/detailed",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/auth/login",
            "/auth/register",
            "/auth/refresh",
            "/auth/password-reset",
            "/auth/password-reset/confirm",
            "/static"
        ]
        
        # Convert to regex patterns
        self.excluded_patterns = [
            re.compile(path.replace("*", ".*") + "$") 
            for path in self.excluded_paths
        ]
    
    async def dispatch(self, request: Request, call_next: Callable):
        """
        Process each request and check authentication
        """
        path = request.url.path
        method = request.method
        
        # Skip authentication for excluded paths
        if self._is_excluded_path(path):
            response = await call_next(request)
            return response
        
        # Skip authentication for OPTIONS requests (CORS preflight)
        if method == "OPTIONS":
            response = await call_next(request)
            return response
        
        # Check for Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Authorization header missing"},
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Extract token from Bearer format
        try:
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid authentication scheme"},
                    headers={"WWW-Authenticate": "Bearer"}
                )
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid authorization header format"},
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Verify token
        try:
            token_data = jwt_handler.verify_token(token)
            
            # Add user info to request state for use in route handlers
            request.state.user_id = token_data.user_id
            request.state.username = token_data.username
            request.state.email = token_data.email
            
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
                headers=getattr(e, "headers", {})
            )
        except Exception as e:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Authentication error"}
            )
        
        # Continue to route handler
        response = await call_next(request)
        return response
    
    def _is_excluded_path(self, path: str) -> bool:
        """
        Check if the path should be excluded from authentication
        """
        for pattern in self.excluded_patterns:
            if pattern.match(path):
                return True
        return False


def add_auth_middleware(app, excluded_paths=None):
    """
    Helper function to add authentication middleware to FastAPI app
    """
    # Only add middleware if JWT_SECRET_KEY is configured and not in testing
    jwt_secret = os.getenv("JWT_SECRET_KEY")
    is_testing = os.getenv("TESTING", "false").lower() == "true"
    
    if jwt_secret and not is_testing:
        app.add_middleware(AuthMiddleware, excluded_paths=excluded_paths)
    else:
        if not jwt_secret:
            print("Warning: JWT_SECRET_KEY not configured. Authentication middleware disabled.")
        if is_testing:
            print("Info: Authentication middleware disabled for testing.")