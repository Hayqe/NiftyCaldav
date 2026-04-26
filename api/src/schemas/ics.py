from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ICSImportResult(BaseModel):
    """Result of ICS import operation."""
    success: bool
    message: str
    imported_count: int = 0
    errors: List[str] = []
    calendar_id: Optional[int] = None


class ICSImportRequest(BaseModel):
    """Request for ICS import."""
    calendar_id: int = Field(..., description="Target calendar ID to import into")
