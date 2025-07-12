"""
Meeting session API endpoints for creating and managing recording sessions
"""

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from typing import Optional, List
import uuid
from datetime import datetime
from pydantic import BaseModel

from ..auth.dependencies import get_current_active_user
from ..auth.models import UserAuth
from ..database.connection import supabase


router = APIRouter(prefix="/api/meetings", tags=["meetings"])


class MeetingCreateRequest(BaseModel):
    """Request model for creating a new meeting session"""
    title: str
    description: Optional[str] = None
    meeting_type: str = "general"  # general, interview, standup, etc.
    participants: List[str] = []
    scheduled_start: Optional[datetime] = None
    estimated_duration: Optional[int] = None  # in minutes


class MeetingResponse(BaseModel):
    """Response model for meeting data"""
    id: str
    title: str
    description: Optional[str]
    meeting_type: str
    status: str
    participants: List[str]
    created_at: datetime
    scheduled_start: Optional[datetime]
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    estimated_duration: Optional[int]
    actual_duration: Optional[int]
    recording_file_id: Optional[str]
    transcript_id: Optional[str]
    user_id: str


class MeetingUpdateRequest(BaseModel):
    """Request model for updating meeting data"""
    title: Optional[str] = None
    description: Optional[str] = None
    participants: Optional[List[str]] = None
    scheduled_start: Optional[datetime] = None
    estimated_duration: Optional[int] = None


class RecordingStartRequest(BaseModel):
    """Request model for starting a recording session"""
    audio_settings: Optional[dict] = None


class RecordingStopRequest(BaseModel):
    """Request model for stopping a recording session"""
    recording_file_id: str
    actual_duration: int  # in seconds


@router.post("/", response_model=MeetingResponse)
async def create_meeting(
    request: MeetingCreateRequest,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Create a new meeting session
    """
    
    meeting_id = str(uuid.uuid4())
    
    meeting_data = {
        "id": meeting_id,
        "title": request.title,
        "description": request.description,
        "meeting_type": request.meeting_type,
        "status": "scheduled",
        "participants": request.participants,
        "user_id": current_user.user_id,
        "created_at": datetime.utcnow(),
        "scheduled_start": request.scheduled_start,
        "estimated_duration": request.estimated_duration,
    }
    
    if not supabase:
        # For development without Supabase, return mock data
        return MeetingResponse(
            **meeting_data,
            actual_start=None,
            actual_end=None,
            actual_duration=None,
            recording_file_id=None,
            transcript_id=None
        )
    
    try:
        # Insert into meetings table
        result = supabase.table("meetings").insert(meeting_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create meeting"
            )
        
        created_meeting = result.data[0]
        return MeetingResponse(**created_meeting)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create meeting: {str(e)}"
        )


@router.get("/", response_model=List[MeetingResponse])
async def list_meetings(
    status: Optional[str] = None,
    meeting_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Get list of meetings for the current user
    """
    
    if not supabase:
        # For development without Supabase, return mock data
        mock_meeting = MeetingResponse(
            id="mock-meeting-123",
            title="Sample Meeting",
            description="A sample meeting for development",
            meeting_type="general",
            status="completed",
            participants=["user1@example.com", "user2@example.com"],
            created_at=datetime.utcnow(),
            scheduled_start=None,
            actual_start=datetime.utcnow(),
            actual_end=None,
            estimated_duration=60,
            actual_duration=45,
            recording_file_id="mock-file-123",
            transcript_id="mock-transcript-123",
            user_id=current_user.user_id
        )
        return [mock_meeting]
    
    try:
        query = supabase.table("meetings").select("*").eq("user_id", current_user.user_id)
        
        if status:
            query = query.eq("status", status)
        if meeting_type:
            query = query.eq("meeting_type", meeting_type)
            
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        
        return [MeetingResponse(**meeting) for meeting in result.data]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch meetings: {str(e)}"
        )


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: str,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Get a specific meeting by ID
    """
    
    if not supabase:
        # For development without Supabase, return mock data
        return MeetingResponse(
            id=meeting_id,
            title="Sample Meeting",
            description="A sample meeting for development",
            meeting_type="general",
            status="completed",
            participants=["user1@example.com"],
            created_at=datetime.utcnow(),
            scheduled_start=None,
            actual_start=datetime.utcnow(),
            actual_end=None,
            estimated_duration=60,
            actual_duration=45,
            recording_file_id="mock-file-123",
            transcript_id="mock-transcript-123",
            user_id=current_user.user_id
        )
    
    try:
        result = supabase.table("meetings").select("*").eq("id", meeting_id).eq("user_id", current_user.user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found"
            )
        
        return MeetingResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch meeting: {str(e)}"
        )


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: str,
    request: MeetingUpdateRequest,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Update meeting information
    """
    
    # Get current meeting to verify ownership
    current_meeting = await get_meeting(meeting_id, current_user)
    
    # Prepare update data
    update_data = {}
    if request.title is not None:
        update_data["title"] = request.title
    if request.description is not None:
        update_data["description"] = request.description
    if request.participants is not None:
        update_data["participants"] = request.participants
    if request.scheduled_start is not None:
        update_data["scheduled_start"] = request.scheduled_start
    if request.estimated_duration is not None:
        update_data["estimated_duration"] = request.estimated_duration
    
    if not update_data:
        return current_meeting
    
    update_data["updated_at"] = datetime.utcnow()
    
    if not supabase:
        # For development without Supabase, return updated mock data
        updated_data = current_meeting.dict()
        updated_data.update(update_data)
        return MeetingResponse(**updated_data)
    
    try:
        result = supabase.table("meetings").update(update_data).eq("id", meeting_id).eq("user_id", current_user.user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found or update failed"
            )
        
        return MeetingResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update meeting: {str(e)}"
        )


@router.post("/{meeting_id}/start-recording")
async def start_recording(
    meeting_id: str,
    request: RecordingStartRequest,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Start recording for a meeting session
    """
    
    # Verify meeting exists and user owns it
    meeting = await get_meeting(meeting_id, current_user)
    
    # Check if meeting is already recording
    if meeting.status == "recording":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meeting is already being recorded"
        )
    
    # Update meeting status
    update_data = {
        "status": "recording",
        "actual_start": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    if not supabase:
        # For development without Supabase
        return {
            "message": "Recording started",
            "meeting_id": meeting_id,
            "started_at": update_data["actual_start"],
            "status": "recording"
        }
    
    try:
        result = supabase.table("meetings").update(update_data).eq("id", meeting_id).eq("user_id", current_user.user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to start recording"
            )
        
        return {
            "message": "Recording started",
            "meeting_id": meeting_id,
            "started_at": update_data["actual_start"],
            "status": "recording"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start recording: {str(e)}"
        )


@router.post("/{meeting_id}/stop-recording")
async def stop_recording(
    meeting_id: str,
    request: RecordingStopRequest,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Stop recording for a meeting session
    """
    
    # Verify meeting exists and user owns it
    meeting = await get_meeting(meeting_id, current_user)
    
    # Check if meeting is currently recording
    if meeting.status != "recording":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meeting is not currently being recorded"
        )
    
    # Update meeting with recording data
    update_data = {
        "status": "processing",  # Will be updated to "completed" after transcription
        "actual_end": datetime.utcnow(),
        "actual_duration": request.actual_duration,
        "recording_file_id": request.recording_file_id,
        "updated_at": datetime.utcnow()
    }
    
    if not supabase:
        # For development without Supabase
        return {
            "message": "Recording stopped",
            "meeting_id": meeting_id,
            "stopped_at": update_data["actual_end"],
            "duration": request.actual_duration,
            "status": "processing"
        }
    
    try:
        result = supabase.table("meetings").update(update_data).eq("id", meeting_id).eq("user_id", current_user.user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to stop recording"
            )
        
        return {
            "message": "Recording stopped",
            "meeting_id": meeting_id,
            "stopped_at": update_data["actual_end"],
            "duration": request.actual_duration,
            "status": "processing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop recording: {str(e)}"
        )


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Delete a meeting session
    """
    
    # Verify meeting exists and user owns it
    await get_meeting(meeting_id, current_user)
    
    if not supabase:
        # For development without Supabase
        return {"message": "Meeting deleted successfully"}
    
    try:
        result = supabase.table("meetings").delete().eq("id", meeting_id).eq("user_id", current_user.user_id).execute()
        
        return {"message": "Meeting deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete meeting: {str(e)}"
        )


@router.get("/{meeting_id}/status")
async def get_meeting_status(
    meeting_id: str,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Get real-time status of a meeting session
    """
    
    meeting = await get_meeting(meeting_id, current_user)
    
    return {
        "meeting_id": meeting_id,
        "status": meeting.status,
        "actual_start": meeting.actual_start,
        "actual_end": meeting.actual_end,
        "actual_duration": meeting.actual_duration,
        "recording_file_id": meeting.recording_file_id,
        "transcript_id": meeting.transcript_id,
    }