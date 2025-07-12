"""
Meeting model for Reverbia application
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from .base import BaseDBModel


class MeetingStatus(str, Enum):
    """Meeting processing status"""
    DRAFT = "draft"
    RECORDING = "recording"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MeetingType(str, Enum):
    """Types of meetings"""
    CLIENT_SCOPING = "client_scoping"
    TECHNICAL_REVIEW = "technical_review"
    PLANNING_SESSION = "planning_session"
    STANDUP = "standup"
    INTERVIEW = "interview"
    CUSTOM = "custom"


class Participant(BaseModel):
    """Meeting participant information"""
    name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = None
    role: Optional[str] = Field(None, max_length=50)
    is_organizer: bool = False


class MeetingBase(BaseModel):
    """Base meeting model"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    meeting_type: MeetingType = MeetingType.CUSTOM
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=600)  # Max 10 hours
    participants: List[Participant] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MeetingCreate(MeetingBase):
    """Model for meeting creation"""
    pass


class MeetingUpdate(BaseModel):
    """Model for meeting updates"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    meeting_type: Optional[MeetingType] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=600)
    participants: Optional[List[Participant]] = None
    tags: Optional[List[str]] = None
    status: Optional[MeetingStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class MeetingInDB(BaseDBModel, MeetingBase):
    """Meeting model as stored in database"""
    user_id: str
    status: MeetingStatus = MeetingStatus.DRAFT
    audio_file_url: Optional[str] = None
    audio_duration: Optional[float] = None  # Duration in seconds
    transcription_status: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class Meeting(BaseDBModel, MeetingBase):
    """Meeting model for API responses"""
    status: MeetingStatus
    audio_file_url: Optional[str] = None
    audio_duration: Optional[float] = None
    transcription_status: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class MeetingStats(BaseModel):
    """Meeting statistics"""
    total_meetings: int
    total_duration_hours: float
    completed_meetings: int
    processing_meetings: int
    failed_meetings: int
    meetings_this_month: int