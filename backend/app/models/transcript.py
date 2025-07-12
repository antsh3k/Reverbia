"""
Transcript model for Reverbia application
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from .base import BaseDBModel


class Speaker(BaseModel):
    """Speaker information in transcript"""
    id: str
    name: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)


class TranscriptSegment(BaseModel):
    """Individual segment of transcript with timing"""
    id: str
    text: str = Field(..., min_length=1)
    start_time: float = Field(..., ge=0.0)  # Seconds from start
    end_time: float = Field(..., ge=0.0)    # Seconds from start
    speaker: Optional[Speaker] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    
    def duration(self) -> float:
        """Calculate segment duration in seconds"""
        return self.end_time - self.start_time


class TranscriptBase(BaseModel):
    """Base transcript model"""
    language: str = Field(default="en", max_length=10)
    segments: List[TranscriptSegment] = Field(default_factory=list)
    speakers: List[Speaker] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    def total_duration(self) -> float:
        """Calculate total transcript duration"""
        if not self.segments:
            return 0.0
        return max(segment.end_time for segment in self.segments)
    
    def get_text(self) -> str:
        """Get full transcript text"""
        return " ".join(segment.text for segment in self.segments)
    
    def get_speaker_segments(self, speaker_id: str) -> List[TranscriptSegment]:
        """Get all segments for a specific speaker"""
        return [
            segment for segment in self.segments 
            if segment.speaker and segment.speaker.id == speaker_id
        ]


class TranscriptCreate(TranscriptBase):
    """Model for transcript creation"""
    meeting_id: str


class TranscriptUpdate(BaseModel):
    """Model for transcript updates"""
    language: Optional[str] = Field(None, max_length=10)
    segments: Optional[List[TranscriptSegment]] = None
    speakers: Optional[List[Speaker]] = None
    metadata: Optional[Dict[str, Any]] = None


class TranscriptInDB(BaseDBModel, TranscriptBase):
    """Transcript model as stored in database"""
    meeting_id: str
    raw_transcript: Optional[str] = None  # Raw API response
    processing_status: str = Field(default="pending")
    word_count: int = Field(default=0)
    
    model_config = ConfigDict(from_attributes=True)


class Transcript(BaseDBModel, TranscriptBase):
    """Transcript model for API responses"""
    meeting_id: str
    processing_status: str
    word_count: int
    
    model_config = ConfigDict(from_attributes=True)


class TranscriptSearchResult(BaseModel):
    """Search result for transcript content"""
    transcript_id: str
    meeting_id: str
    segment_id: str
    text: str
    start_time: float
    end_time: float
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    context_before: Optional[str] = None
    context_after: Optional[str] = None