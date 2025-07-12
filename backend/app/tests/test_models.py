"""
Unit tests for database models
"""

import pytest
from datetime import datetime
from app.models.user import User, UserCreate, UserUpdate, UserProfile
from app.models.meeting import Meeting, MeetingCreate, MeetingStatus, MeetingType, Participant
from app.models.transcript import Transcript, TranscriptSegment, Speaker, TranscriptBase
from app.models.document import Document, DocumentCreate, DocumentType, DocumentFormat, DocumentStatus


class TestUserModels:
    """Test user-related models"""
    
    def test_user_create_valid(self):
        """Test creating a valid user"""
        user_data = {
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "password123"
        }
        user = UserCreate(**user_data)
        assert user.email == "test@example.com"
        assert user.full_name == "Test User"
        assert user.password == "password123"
        assert user.is_active is True
        assert user.is_verified is False
    
    def test_user_create_invalid_email(self):
        """Test user creation with invalid email"""
        user_data = {
            "email": "invalid-email",
            "full_name": "Test User", 
            "password": "password123"
        }
        with pytest.raises(Exception):  # Pydantic validation error
            UserCreate(**user_data)
    
    def test_user_create_short_password(self):
        """Test user creation with short password"""
        user_data = {
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "123"  # Too short
        }
        with pytest.raises(Exception):  # Pydantic validation error
            UserCreate(**user_data)
    
    def test_user_update_partial(self):
        """Test partial user update"""
        update_data = {"full_name": "Updated Name"}
        user_update = UserUpdate(**update_data)
        assert user_update.full_name == "Updated Name"
        assert user_update.email is None
        assert user_update.is_active is None
    
    def test_user_profile(self):
        """Test user profile model"""
        profile_data = {
            "bio": "Software developer",
            "company": "Test Company",
            "job_title": "Senior Developer",
            "timezone": "UTC"
        }
        profile = UserProfile(**profile_data)
        assert profile.bio == "Software developer"
        assert profile.company == "Test Company"
        assert profile.timezone == "UTC"


class TestMeetingModels:
    """Test meeting-related models"""
    
    def test_meeting_create_valid(self):
        """Test creating a valid meeting"""
        participants = [
            Participant(name="John Doe", email="john@example.com", is_organizer=True),
            Participant(name="Jane Smith", role="Client")
        ]
        
        meeting_data = {
            "title": "Client Scoping Call",
            "description": "Initial project scoping",
            "meeting_type": MeetingType.CLIENT_SCOPING,
            "duration_minutes": 60,
            "participants": participants,
            "tags": ["important", "client"]
        }
        
        meeting = MeetingCreate(**meeting_data)
        assert meeting.title == "Client Scoping Call"
        assert meeting.meeting_type == MeetingType.CLIENT_SCOPING
        assert meeting.duration_minutes == 60
        assert len(meeting.participants) == 2
        assert meeting.participants[0].is_organizer is True
        assert meeting.tags == ["important", "client"]
    
    def test_participant_model(self):
        """Test participant model"""
        participant_data = {
            "name": "Test Participant",
            "email": "participant@example.com",
            "role": "Product Manager",
            "is_organizer": False
        }
        participant = Participant(**participant_data)
        assert participant.name == "Test Participant"
        assert participant.email == "participant@example.com"
        assert participant.role == "Product Manager"
        assert participant.is_organizer is False
    
    def test_meeting_invalid_duration(self):
        """Test meeting with invalid duration"""
        meeting_data = {
            "title": "Test Meeting",
            "duration_minutes": 700  # Too long (over 10 hours)
        }
        with pytest.raises(Exception):  # Pydantic validation error
            MeetingCreate(**meeting_data)


class TestTranscriptModels:
    """Test transcript-related models"""
    
    def test_speaker_model(self):
        """Test speaker model"""
        speaker_data = {
            "id": "speaker_1",
            "name": "John Doe",
            "confidence": 0.95
        }
        speaker = Speaker(**speaker_data)
        assert speaker.id == "speaker_1"
        assert speaker.name == "John Doe"
        assert speaker.confidence == 0.95
    
    def test_transcript_segment(self):
        """Test transcript segment model"""
        speaker = Speaker(id="speaker_1", name="John", confidence=0.9)
        segment_data = {
            "id": "segment_1",
            "text": "Hello, welcome to the meeting",
            "start_time": 0.0,
            "end_time": 3.5,
            "speaker": speaker,
            "confidence": 0.92
        }
        segment = TranscriptSegment(**segment_data)
        assert segment.text == "Hello, welcome to the meeting"
        assert segment.duration() == 3.5
        assert segment.speaker.name == "John"
    
    def test_transcript_base_methods(self):
        """Test transcript base model methods"""
        speakers = [Speaker(id="speaker_1", confidence=1.0)]
        segments = [
            TranscriptSegment(
                id="seg_1", text="First segment", 
                start_time=0.0, end_time=2.0, confidence=0.9
            ),
            TranscriptSegment(
                id="seg_2", text="Second segment",
                start_time=2.0, end_time=5.0, confidence=0.95
            )
        ]
        
        transcript = TranscriptBase(segments=segments, speakers=speakers)
        assert transcript.total_duration() == 5.0
        assert transcript.get_text() == "First segment Second segment"
        assert len(transcript.segments) == 2


class TestDocumentModels:
    """Test document-related models"""
    
    def test_document_create(self):
        """Test document creation"""
        doc_data = {
            "title": "Project Requirements",
            "description": "Initial project requirements document",
            "document_type": DocumentType.UPLOAD,
            "format": DocumentFormat.PDF,
            "file_size": 1024000,
            "tags": ["requirements", "project"],
            "meeting_id": "meeting_123"
        }
        document = DocumentCreate(**doc_data)
        assert document.title == "Project Requirements"
        assert document.document_type == DocumentType.UPLOAD
        assert document.format == DocumentFormat.PDF
        assert document.file_size == 1024000
        assert "requirements" in document.tags
    
    def test_document_enums(self):
        """Test document enum values"""
        assert DocumentType.UPLOAD == "upload"
        assert DocumentType.GENERATED == "generated"
        assert DocumentType.TEMPLATE == "template"
        
        assert DocumentFormat.PDF == "pdf"
        assert DocumentFormat.DOCX == "docx"
        
        assert DocumentStatus.PROCESSING == "processing"
        assert DocumentStatus.COMPLETED == "completed"
    
    def test_document_invalid_file_size(self):
        """Test document with invalid file size"""
        doc_data = {
            "title": "Test Doc",
            "document_type": DocumentType.UPLOAD,
            "format": DocumentFormat.PDF,
            "file_size": -100  # Negative size
        }
        with pytest.raises(Exception):  # Pydantic validation error
            DocumentCreate(**doc_data)