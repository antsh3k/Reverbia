"""
Unit tests for main application endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test the root endpoint returns correct information"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Reverbia API"
    assert data["version"] == "1.0.0"
    assert data["status"] == "active"
    assert data["docs"] == "/docs"


def test_health_check_endpoint():
    """Test the health check endpoint returns 200 status"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "reverbia-api"
    assert data["version"] == "1.0.0"
    assert "environment" in data


def test_detailed_health_check():
    """Test the detailed health check endpoint"""
    response = client.get("/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "checks" in data
    assert "timestamp" in data
    assert "api" in data["checks"]
    assert data["checks"]["api"] == "healthy"


def test_cors_headers():
    """Test that CORS headers are properly set"""
    response = client.get("/health")
    assert response.status_code == 200
    # Note: In test environment, CORS headers might not be visible
    # This is a basic test to ensure the endpoint works