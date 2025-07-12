"""
Document model for Reverbia application
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from .base import BaseDBModel


class DocumentType(str, Enum):
    """Types of documents"""
    UPLOAD = "upload"           # User uploaded document
    GENERATED = "generated"     # AI generated document
    TEMPLATE = "template"       # Document template


class DocumentFormat(str, Enum):
    """Document formats"""
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    MD = "md"
    HTML = "html"


class DocumentStatus(str, Enum):
    """Document processing status"""
    UPLOADING = "uploading"
    PROCESSING = "processing" 
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentBase(BaseModel):
    """Base document model"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    document_type: DocumentType
    format: DocumentFormat
    file_size: Optional[int] = Field(None, ge=0)  # Size in bytes
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentCreate(DocumentBase):
    """Model for document creation"""
    meeting_id: Optional[str] = None  # Associated meeting if any


class DocumentUpdate(BaseModel):
    """Model for document updates"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[DocumentStatus] = None


class DocumentInDB(BaseDBModel, DocumentBase):
    """Document model as stored in database"""
    user_id: str
    meeting_id: Optional[str] = None
    file_url: str  # Storage URL
    file_path: Optional[str] = None  # Local file path if any
    content_text: Optional[str] = None  # Extracted text content
    status: DocumentStatus = DocumentStatus.PROCESSING
    word_count: Optional[int] = None
    page_count: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class Document(BaseDBModel, DocumentBase):
    """Document model for API responses"""
    file_url: str
    content_text: Optional[str] = None
    status: DocumentStatus
    word_count: Optional[int] = None
    page_count: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class DocumentTemplate(BaseDBModel):
    """Document template model"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    template_type: str = Field(..., max_length=50)  # SOW, summary, action_plan, etc.
    template_content: str  # Template content with placeholders
    variables: List[str] = Field(default_factory=list)  # Required variables
    format: DocumentFormat = DocumentFormat.PDF
    is_public: bool = Field(default=False)
    user_id: Optional[str] = None  # None for system templates
    
    model_config = ConfigDict(from_attributes=True)


class DocumentGeneration(BaseModel):
    """Document generation request"""
    template_id: str
    meeting_id: str
    variables: Dict[str, Any] = Field(default_factory=dict)
    format: DocumentFormat = DocumentFormat.PDF
    title: Optional[str] = None


class DocumentChunk(BaseModel):
    """Document chunk for vector storage"""
    document_id: str
    chunk_id: str
    content: str = Field(..., min_length=1)
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    start_char: Optional[int] = None
    end_char: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)