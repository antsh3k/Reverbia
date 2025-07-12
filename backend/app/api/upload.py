"""
File upload API endpoints for audio files and meeting recordings
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, List
import os
import uuid
import mimetypes
from datetime import datetime
import asyncio
import aiofiles
from pydantic import BaseModel

from ..auth.dependencies import get_current_active_user
from ..auth.models import UserAuth
from ..database.connection import supabase


router = APIRouter(prefix="/api/upload", tags=["upload"])


class UploadResponse(BaseModel):
    """Response model for file upload"""
    file_id: str
    filename: str
    file_size: int
    mime_type: str
    upload_url: Optional[str] = None
    message: str


class ChunkUploadResponse(BaseModel):
    """Response model for chunked upload"""
    chunk_id: str
    upload_id: str
    chunk_number: int
    total_chunks: int
    bytes_received: int
    message: str


# Allowed file types and size limits
ALLOWED_AUDIO_TYPES = {
    'audio/webm',
    'audio/wav', 
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/m4a',
    'audio/aac'
}

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
CHUNK_SIZE = 5 * 1024 * 1024  # 5MB chunks


def validate_audio_file(file: UploadFile) -> None:
    """Validate uploaded audio file"""
    
    # Check file type
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed types: {', '.join(ALLOWED_AUDIO_TYPES)}"
        )
    
    # Check file extension (additional validation)
    if file.filename:
        _, ext = os.path.splitext(file.filename.lower())
        valid_extensions = {'.webm', '.wav', '.mp3', '.ogg', '.m4a', '.aac'}
        if ext not in valid_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file extension: {ext}. Allowed extensions: {', '.join(valid_extensions)}"
            )


async def save_upload_metadata(
    user_id: str,
    file_id: str,
    filename: str,
    file_size: int,
    mime_type: str,
    upload_path: str
) -> None:
    """Save upload metadata to database"""
    
    if not supabase:
        # For development without Supabase, just log
        print(f"Would save upload metadata: {file_id}, {filename}, {file_size} bytes")
        return
    
    try:
        upload_data = {
            "id": file_id,
            "user_id": user_id,
            "filename": filename,
            "file_size": file_size,
            "mime_type": mime_type,
            "file_path": upload_path,
            "upload_status": "completed",
            "created_at": datetime.utcnow().isoformat(),
        }
        
        # Insert into uploads table (you may need to create this table)
        # For now, we'll store in a generic table or file system
        print(f"Upload metadata saved: {upload_data}")
        
    except Exception as e:
        print(f"Failed to save upload metadata: {e}")
        # Don't fail the upload if metadata save fails


@router.post("/audio", response_model=UploadResponse)
async def upload_audio_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Upload a single audio file
    """
    
    # Validate file
    validate_audio_file(file)
    
    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    try:
        # Generate unique file ID and path
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename or "")[1] or ".webm"
        safe_filename = f"{file_id}{file_extension}"
        
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join("uploads", "audio", current_user.user_id)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Full file path
        file_path = os.path.join(upload_dir, safe_filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
            file_size = len(content)
        
        # Save metadata in background
        background_tasks.add_task(
            save_upload_metadata,
            current_user.user_id,
            file_id,
            file.filename or safe_filename,
            file_size,
            file.content_type or "audio/webm",
            file_path
        )
        
        return UploadResponse(
            file_id=file_id,
            filename=file.filename or safe_filename,
            file_size=file_size,
            mime_type=file.content_type or "audio/webm",
            message="File uploaded successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@router.post("/audio/chunked/start")
async def start_chunked_upload(
    filename: str,
    file_size: int,
    mime_type: str,
    chunk_size: int = CHUNK_SIZE,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Start a chunked upload session for large files
    """
    
    # Validate parameters
    if mime_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {mime_type}"
        )
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate upload session ID
    upload_id = str(uuid.uuid4())
    file_id = str(uuid.uuid4())
    
    # Calculate total chunks
    total_chunks = (file_size + chunk_size - 1) // chunk_size
    
    # Create session metadata
    session_data = {
        "upload_id": upload_id,
        "file_id": file_id,
        "user_id": current_user.user_id,
        "filename": filename,
        "file_size": file_size,
        "mime_type": mime_type,
        "chunk_size": chunk_size,
        "total_chunks": total_chunks,
        "uploaded_chunks": [],
        "created_at": datetime.utcnow().isoformat(),
    }
    
    # For development, store in memory or file system
    # In production, this would go to a database or cache
    upload_sessions_dir = os.path.join("uploads", "sessions")
    os.makedirs(upload_sessions_dir, exist_ok=True)
    
    session_file = os.path.join(upload_sessions_dir, f"{upload_id}.json")
    async with aiofiles.open(session_file, 'w') as f:
        import json
        await f.write(json.dumps(session_data))
    
    return {
        "upload_id": upload_id,
        "file_id": file_id,
        "total_chunks": total_chunks,
        "chunk_size": chunk_size,
        "message": "Chunked upload session started"
    }


@router.post("/audio/chunked/upload/{upload_id}", response_model=ChunkUploadResponse)
async def upload_chunk(
    upload_id: str,
    chunk_number: int,
    chunk: UploadFile = File(...),
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Upload a single chunk of a file
    """
    
    try:
        # Load session data
        session_file = os.path.join("uploads", "sessions", f"{upload_id}.json")
        
        if not os.path.exists(session_file):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload session not found"
            )
        
        async with aiofiles.open(session_file, 'r') as f:
            import json
            session_data = json.loads(await f.read())
        
        # Verify user owns this session
        if session_data["user_id"] != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to upload session"
            )
        
        # Validate chunk number
        if chunk_number < 1 or chunk_number > session_data["total_chunks"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid chunk number. Expected 1-{session_data['total_chunks']}"
            )
        
        # Check if chunk already uploaded
        if chunk_number in session_data["uploaded_chunks"]:
            return ChunkUploadResponse(
                chunk_id=f"{upload_id}-{chunk_number}",
                upload_id=upload_id,
                chunk_number=chunk_number,
                total_chunks=session_data["total_chunks"],
                bytes_received=0,  # Already received
                message="Chunk already uploaded"
            )
        
        # Create chunks directory
        chunks_dir = os.path.join("uploads", "chunks", upload_id)
        os.makedirs(chunks_dir, exist_ok=True)
        
        # Save chunk
        chunk_filename = f"chunk_{chunk_number:04d}"
        chunk_path = os.path.join(chunks_dir, chunk_filename)
        
        content = await chunk.read()
        async with aiofiles.open(chunk_path, 'wb') as f:
            await f.write(content)
        
        # Update session data
        session_data["uploaded_chunks"].append(chunk_number)
        session_data["uploaded_chunks"].sort()
        
        # Save updated session
        async with aiofiles.open(session_file, 'w') as f:
            await f.write(json.dumps(session_data))
        
        return ChunkUploadResponse(
            chunk_id=f"{upload_id}-{chunk_number}",
            upload_id=upload_id,
            chunk_number=chunk_number,
            total_chunks=session_data["total_chunks"],
            bytes_received=len(content),
            message="Chunk uploaded successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chunk upload failed: {str(e)}"
        )


@router.post("/audio/chunked/complete/{upload_id}")
async def complete_chunked_upload(
    upload_id: str,
    background_tasks: BackgroundTasks,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Complete a chunked upload by combining all chunks
    """
    
    try:
        # Load session data
        session_file = os.path.join("uploads", "sessions", f"{upload_id}.json")
        
        if not os.path.exists(session_file):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload session not found"
            )
        
        async with aiofiles.open(session_file, 'r') as f:
            import json
            session_data = json.loads(await f.read())
        
        # Verify user owns this session
        if session_data["user_id"] != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to upload session"
            )
        
        # Check all chunks are uploaded
        expected_chunks = list(range(1, session_data["total_chunks"] + 1))
        if session_data["uploaded_chunks"] != expected_chunks:
            missing_chunks = set(expected_chunks) - set(session_data["uploaded_chunks"])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing chunks: {sorted(missing_chunks)}"
            )
        
        # Combine chunks
        file_id = session_data["file_id"]
        filename = session_data["filename"]
        file_extension = os.path.splitext(filename)[1] or ".webm"
        safe_filename = f"{file_id}{file_extension}"
        
        # Create final file directory
        upload_dir = os.path.join("uploads", "audio", current_user.user_id)
        os.makedirs(upload_dir, exist_ok=True)
        final_path = os.path.join(upload_dir, safe_filename)
        
        # Combine chunks in order
        chunks_dir = os.path.join("uploads", "chunks", upload_id)
        total_bytes = 0
        
        async with aiofiles.open(final_path, 'wb') as final_file:
            for chunk_num in range(1, session_data["total_chunks"] + 1):
                chunk_path = os.path.join(chunks_dir, f"chunk_{chunk_num:04d}")
                async with aiofiles.open(chunk_path, 'rb') as chunk_file:
                    chunk_data = await chunk_file.read()
                    await final_file.write(chunk_data)
                    total_bytes += len(chunk_data)
        
        # Cleanup chunks and session
        import shutil
        shutil.rmtree(chunks_dir)
        os.remove(session_file)
        
        # Save metadata in background
        background_tasks.add_task(
            save_upload_metadata,
            current_user.user_id,
            file_id,
            filename,
            total_bytes,
            session_data["mime_type"],
            final_path
        )
        
        return UploadResponse(
            file_id=file_id,
            filename=filename,
            file_size=total_bytes,
            mime_type=session_data["mime_type"],
            message="Chunked upload completed successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete chunked upload: {str(e)}"
        )


@router.get("/audio/status/{file_id}")
async def get_upload_status(
    file_id: str,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Get upload status for a file
    """
    
    # For development, check if file exists in user's directory
    upload_dir = os.path.join("uploads", "audio", current_user.user_id)
    
    # Look for file with this ID
    if os.path.exists(upload_dir):
        for filename in os.listdir(upload_dir):
            if filename.startswith(file_id):
                file_path = os.path.join(upload_dir, filename)
                file_size = os.path.getsize(file_path)
                
                return {
                    "file_id": file_id,
                    "status": "completed",
                    "file_size": file_size,
                    "file_path": file_path,
                }
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="File not found"
    )


@router.delete("/audio/{file_id}")
async def delete_upload(
    file_id: str,
    current_user: UserAuth = Depends(get_current_active_user)
):
    """
    Delete an uploaded file
    """
    
    try:
        upload_dir = os.path.join("uploads", "audio", current_user.user_id)
        
        # Find and delete file
        if os.path.exists(upload_dir):
            for filename in os.listdir(upload_dir):
                if filename.startswith(file_id):
                    file_path = os.path.join(upload_dir, filename)
                    os.remove(file_path)
                    
                    return {"message": "File deleted successfully"}
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}"
        )