"""
Unit tests for meeting session API endpoints
"""

import pytest
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.auth.models import UserAuth


class TestMeetingsAPI:
    """Test meeting session endpoints"""
    
    def setup_method(self):
        """Set up test client"""
        # Disable auth middleware for testing
        os.environ["TESTING"] = "true"
        self.client = TestClient(app)
    
    @patch('app.api.meetings.get_current_active_user')
    def test_create_meeting(self, mock_user):
        """Test creating a new meeting session"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_data = {
            "title": "Test Meeting",
            "description": "A test meeting",
            "meeting_type": "general",
            "participants": ["user1@example.com", "user2@example.com"],
            "estimated_duration": 60
        }
        
        response = self.client.post("/api/meetings/", json=meeting_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Meeting"
        assert data["description"] == "A test meeting"
        assert data["meeting_type"] == "general"
        assert data["status"] == "scheduled"
        assert len(data["participants"]) == 2
        assert data["user_id"] == "test-user-123"
        assert "id" in data
    
    @patch('app.api.meetings.get_current_active_user')
    def test_list_meetings(self, mock_user):
        """Test listing meetings for a user"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        response = self.client.get("/api/meetings/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should return mock data in development mode
        if data:
            assert "id" in data[0]
            assert "title" in data[0]
            assert "status" in data[0]
    
    @patch('app.api.meetings.get_current_active_user')
    def test_get_meeting(self, mock_user):
        """Test getting a specific meeting"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_id = "test-meeting-123"
        response = self.client.get(f"/api/meetings/{meeting_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == meeting_id
        assert "title" in data
        assert "status" in data
        assert data["user_id"] == "test-user-123"
    
    @patch('app.api.meetings.get_current_active_user')
    def test_update_meeting(self, mock_user):
        """Test updating meeting information"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_id = "test-meeting-123"
        update_data = {
            "title": "Updated Meeting Title",
            "description": "Updated description",
            "participants": ["new@example.com"]
        }
        
        response = self.client.put(f"/api/meetings/{meeting_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        # In development mode, it returns the original mock data
        # In a real implementation with Supabase, it would return updated data
        assert "id" in data
        assert "title" in data
    
    @patch('app.api.meetings.get_current_active_user')
    def test_start_recording(self, mock_user):
        """Test starting recording for a meeting"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_id = "test-meeting-123"
        recording_data = {
            "audio_settings": {
                "format": "webm",
                "quality": "high"
            }
        }
        
        response = self.client.post(
            f"/api/meetings/{meeting_id}/start-recording",
            json=recording_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_id"] == meeting_id
        assert data["status"] == "recording"
        assert "started_at" in data
        assert "Recording started" in data["message"]
    
    @patch('app.api.meetings.get_current_active_user')
    def test_stop_recording(self, mock_user):
        """Test stopping recording for a meeting"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_id = "test-meeting-123"
        stop_data = {
            "recording_file_id": "recorded-file-123",
            "actual_duration": 1800  # 30 minutes in seconds
        }
        
        # Mock the meeting to have recording status
        with patch('app.api.meetings.get_meeting') as mock_get_meeting:
            mock_meeting = {
                "id": meeting_id,
                "status": "recording",
                "user_id": "test-user-123"
            }
            mock_get_meeting.return_value = type('obj', (object,), mock_meeting)
            
            response = self.client.post(
                f"/api/meetings/{meeting_id}/stop-recording",
                json=stop_data
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_id"] == meeting_id
        assert data["status"] == "processing"
        assert data["duration"] == 1800
        assert "Recording stopped" in data["message"]
    
    @patch('app.api.meetings.get_current_active_user')
    def test_get_meeting_status(self, mock_user):
        """Test getting meeting status"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_id = "test-meeting-123"
        response = self.client.get(f"/api/meetings/{meeting_id}/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_id"] == meeting_id
        assert "status" in data
    
    @patch('app.api.meetings.get_current_active_user')
    def test_delete_meeting(self, mock_user):
        """Test deleting a meeting"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_id = "test-meeting-123"
        response = self.client.delete(f"/api/meetings/{meeting_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "successfully" in data["message"]
    
    @patch('app.api.meetings.get_current_active_user')
    def test_list_meetings_with_filters(self, mock_user):
        """Test listing meetings with status and type filters"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        response = self.client.get(
            "/api/meetings/",
            params={
                "status": "completed",
                "meeting_type": "interview",
                "limit": 10,
                "offset": 0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @patch('app.api.meetings.get_current_active_user')
    def test_create_meeting_minimal_data(self, mock_user):
        """Test creating meeting with minimal required data"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_data = {
            "title": "Minimal Meeting",
            "meeting_type": "general"
        }
        
        response = self.client.post("/api/meetings/", json=meeting_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Minimal Meeting"
        assert data["meeting_type"] == "general"
        assert data["participants"] == []
        assert data["description"] is None
    
    @patch('app.api.meetings.get_current_active_user')
    def test_update_meeting_partial(self, mock_user):
        """Test partial update of meeting"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_id = "test-meeting-123"
        update_data = {
            "title": "Partially Updated Meeting"
            # Only updating title, leaving other fields unchanged
        }
        
        response = self.client.put(f"/api/meetings/{meeting_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
    
    @patch('app.api.meetings.get_current_active_user')
    def test_start_recording_already_recording(self, mock_user):
        """Test starting recording when already recording"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_id = "test-meeting-123"
        
        # Mock the meeting to already be recording
        with patch('app.api.meetings.get_meeting') as mock_get_meeting:
            mock_meeting = type('obj', (object,), {
                "id": meeting_id,
                "status": "recording",
                "user_id": "test-user-123"
            })
            mock_get_meeting.return_value = mock_meeting
            
            response = self.client.post(
                f"/api/meetings/{meeting_id}/start-recording",
                json={"audio_settings": {}}
            )
        
        assert response.status_code == 400
        assert "already being recorded" in response.json()["detail"]
    
    @patch('app.api.meetings.get_current_active_user')
    def test_stop_recording_not_recording(self, mock_user):
        """Test stopping recording when not recording"""
        mock_user.return_value = UserAuth(
            user_id="test-user-123",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            created_at="2024-01-01T00:00:00Z"
        )
        
        meeting_id = "test-meeting-123"
        
        # Mock the meeting to not be recording
        with patch('app.api.meetings.get_meeting') as mock_get_meeting:
            mock_meeting = type('obj', (object,), {
                "id": meeting_id,
                "status": "scheduled",
                "user_id": "test-user-123"
            })
            mock_get_meeting.return_value = mock_meeting
            
            response = self.client.post(
                f"/api/meetings/{meeting_id}/stop-recording",
                json={
                    "recording_file_id": "file-123",
                    "actual_duration": 1800
                }
            )
        
        assert response.status_code == 400
        assert "not currently being recorded" in response.json()["detail"]