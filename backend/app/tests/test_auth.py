"""
Unit tests for authentication system
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
import os
from datetime import datetime, timedelta

from app.main import app
from app.auth.jwt_handler import JWTHandler
from app.auth.models import TokenData, UserAuth
from app.auth.dependencies import get_current_user, get_current_active_user


class TestJWTHandler:
    """Test JWT token handling"""
    
    def setup_method(self):
        """Set up test environment"""
        self.jwt_handler = JWTHandler()
    
    def test_create_access_token(self):
        """Test access token creation"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = self.jwt_handler.create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_refresh_token(self):
        """Test refresh token creation"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = self.jwt_handler.create_refresh_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_verify_valid_access_token(self):
        """Test verification of valid access token"""
        data = {"sub": "user123", "email": "test@example.com", "username": "testuser"}
        token = self.jwt_handler.create_access_token(data)
        
        token_data = self.jwt_handler.verify_token(token, "access")
        
        assert token_data.user_id == "user123"
        assert token_data.email == "test@example.com"
        assert token_data.username == "testuser"
    
    def test_verify_invalid_token(self):
        """Test verification of invalid token"""
        with pytest.raises(HTTPException) as exc_info:
            self.jwt_handler.verify_token("invalid_token", "access")
        
        assert exc_info.value.status_code == 401
    
    def test_verify_wrong_token_type(self):
        """Test verification with wrong token type"""
        data = {"sub": "user123", "email": "test@example.com"}
        access_token = self.jwt_handler.create_access_token(data)
        
        with pytest.raises(HTTPException) as exc_info:
            self.jwt_handler.verify_token(access_token, "refresh")
        
        assert exc_info.value.status_code == 401
        assert "Invalid token type" in str(exc_info.value.detail)
    
    def test_refresh_access_token(self):
        """Test access token refresh"""
        data = {"sub": "user123", "email": "test@example.com", "username": "testuser"}
        refresh_token = self.jwt_handler.create_refresh_token(data)
        
        new_access_token = self.jwt_handler.refresh_access_token(refresh_token)
        
        assert isinstance(new_access_token, str)
        assert len(new_access_token) > 0
        
        # Verify new token works
        token_data = self.jwt_handler.verify_token(new_access_token, "access")
        assert token_data.user_id == "user123"
    
    def test_get_token_expiry(self):
        """Test token expiry time calculation"""
        access_expiry = self.jwt_handler.get_token_expiry("access")
        refresh_expiry = self.jwt_handler.get_token_expiry("refresh")
        
        assert access_expiry == 30 * 60  # 30 minutes in seconds
        assert refresh_expiry == 7 * 24 * 60 * 60  # 7 days in seconds


class TestAuthDependencies:
    """Test authentication dependencies"""
    
    @pytest.mark.asyncio
    async def test_get_current_user_development_mode(self):
        """Test get_current_user in development mode"""
        mock_credentials = MagicMock()
        mock_credentials.credentials = "valid_token"
        
        # Mock JWT verification
        with patch('app.auth.dependencies.jwt_handler') as mock_jwt:
            mock_jwt.verify_token.return_value = TokenData(
                user_id="dev-user-123",
                email="dev@example.com",
                username="Development User",
                exp=datetime.utcnow() + timedelta(minutes=30)
            )
            
            # Mock Supabase as None (development mode)
            with patch('app.auth.dependencies.supabase', None):
                with patch.dict(os.environ, {'ENVIRONMENT': 'development'}):
                    user = await get_current_user(mock_credentials)
                    
                    assert user.user_id == "dev-user-123"
                    assert user.email == "dev@example.com"
                    assert user.is_active is True
    
    @pytest.mark.asyncio 
    async def test_get_current_user_no_credentials(self):
        """Test get_current_user with no credentials"""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(None)
        
        assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_current_active_user_inactive(self):
        """Test get_current_active_user with inactive user"""
        inactive_user = UserAuth(
            user_id="user123",
            email="test@example.com",
            is_active=False,
            is_verified=True,
            created_at=datetime.utcnow()
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_active_user(inactive_user)
        
        assert exc_info.value.status_code == 400
        assert "Inactive user" in str(exc_info.value.detail)


class TestAuthRoutes:
    """Test authentication routes"""
    
    def setup_method(self):
        """Set up test client"""
        # Disable auth middleware for testing
        os.environ["TESTING"] = "true"
        self.client = TestClient(app)
    
    @patch('app.auth.routes.supabase', None)
    @patch.dict(os.environ, {'ENVIRONMENT': 'development'})
    def test_register_development_mode(self):
        """Test user registration in development mode"""
        register_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "username": "testuser"
        }
        
        response = self.client.post("/auth/register", json=register_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    @patch('app.auth.routes.supabase', None)
    @patch.dict(os.environ, {'ENVIRONMENT': 'development'})
    def test_login_development_mode(self):
        """Test user login in development mode"""
        login_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        
        response = self.client.post("/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    @patch('app.auth.routes.supabase', None)
    @patch.dict(os.environ, {'ENVIRONMENT': 'development'})
    def test_refresh_token(self):
        """Test token refresh"""
        # First login to get tokens
        login_data = {
            "email": "test@example.com", 
            "password": "testpassword123"
        }
        login_response = self.client.post("/auth/login", json=login_data)
        tokens = login_response.json()
        
        # Use refresh token to get new access token
        refresh_response = self.client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {tokens['refresh_token']}"}
        )
        
        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()
        assert "access_token" in refresh_data
        assert refresh_data["token_type"] == "bearer"
    
    def test_get_current_user_without_token(self):
        """Test /auth/me endpoint without token"""
        response = self.client.get("/auth/me")
        
        # Should get 401 (unauthorized) since no Authorization header is provided
        assert response.status_code == 401
    
    @patch('app.auth.routes.supabase', None)
    @patch.dict(os.environ, {'ENVIRONMENT': 'development'})
    def test_get_current_user_with_token(self):
        """Test /auth/me endpoint with valid token"""
        # First login to get token
        login_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        login_response = self.client.post("/auth/login", json=login_data)
        tokens = login_response.json()
        
        # Get user info with token
        response = self.client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        
        assert response.status_code == 200
        user_data = response.json()
        assert "user_id" in user_data
        assert "email" in user_data
        assert user_data["email"] == "test@example.com"
    
    @patch('app.auth.routes.supabase', None)
    def test_password_reset_development_mode(self):
        """Test password reset in development mode"""
        reset_data = {"email": "test@example.com"}
        
        response = self.client.post("/auth/password-reset", json=reset_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "Password reset email sent" in data["message"]
    
    @patch('app.auth.routes.supabase', None)
    @patch.dict(os.environ, {'ENVIRONMENT': 'development'})
    def test_logout(self):
        """Test user logout"""
        # First login to get token
        login_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        login_response = self.client.post("/auth/login", json=login_data)
        tokens = login_response.json()
        
        # Logout with token
        response = self.client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "Successfully logged out" in data["message"]


class TestAuthModels:
    """Test authentication models"""
    
    def test_token_data_model(self):
        """Test TokenData model"""
        token_data = TokenData(
            user_id="user123",
            username="testuser",
            email="test@example.com",
            exp=datetime.utcnow()
        )
        
        assert token_data.user_id == "user123"
        assert token_data.username == "testuser"
        assert token_data.email == "test@example.com"
    
    def test_user_auth_model(self):
        """Test UserAuth model"""
        user = UserAuth(
            user_id="user123",
            email="test@example.com",
            username="testuser",
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow(),
            last_login=datetime.utcnow()
        )
        
        assert user.user_id == "user123"
        assert user.email == "test@example.com"
        assert user.is_active is True
        assert user.is_verified is True
    
    def test_login_request_validation(self):
        """Test LoginRequest model validation"""
        from app.auth.models import LoginRequest
        
        # Valid request
        valid_request = LoginRequest(
            email="test@example.com",
            password="validpassword123"
        )
        assert valid_request.email == "test@example.com"
        
        # Invalid password (too short)
        with pytest.raises(ValueError):
            LoginRequest(
                email="test@example.com",
                password="short"
            )
    
    def test_register_request_validation(self):
        """Test RegisterRequest model validation"""
        from app.auth.models import RegisterRequest
        
        # Valid request
        valid_request = RegisterRequest(
            email="test@example.com",
            password="validpassword123",
            username="testuser"
        )
        assert valid_request.email == "test@example.com"
        assert valid_request.username == "testuser"
        
        # Valid request without username
        valid_request_no_username = RegisterRequest(
            email="test@example.com",
            password="validpassword123"
        )
        assert valid_request_no_username.username is None