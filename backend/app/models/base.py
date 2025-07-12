"""
Base database model with common fields
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class BaseDBModel(BaseModel):
    """Base model with common database fields"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class TimestampMixin(BaseModel):
    """Mixin for models that need timestamp tracking"""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)