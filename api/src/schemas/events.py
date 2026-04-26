from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class EventBase(BaseModel):
    summary: str = Field(..., min_length=1, max_length=255)
    start: datetime
    end: datetime


class EventCreate(EventBase):
    description: Optional[str] = None
    location: Optional[str] = None


class EventUpdate(EventBase):
    description: Optional[str] = None
    location: Optional[str] = None


class EventInDB(EventBase):
    id: str  # URL of the event in CalDAV
    title: str  # Alias for summary - frontend expects 'title'
    description: Optional[str] = None
    location: Optional[str] = None
    all_day: bool = False
    recurring: bool = False
    recurrence_rule: Optional[str] = None
    color: Optional[str] = None
    calendar_id: Optional[int] = None  # Our internal calendar ID
    calendar_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    events: List[EventInDB]
    total: int
