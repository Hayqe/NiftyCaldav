from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CalendarBase(BaseModel):
    """Base calendar fields."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = "blue"


class CalendarCreate(CalendarBase):
    """Create a new calendar."""
    pass


class CalendarUpdate(CalendarBase):
    """Update calendar."""
    pass


# Radicale-only calendar schema with virtual ID for frontend compatibility
class CalendarRadicale(CalendarBase):
    """Calendar from Radicale with virtual ID."""
    id: int  # Virtual ID generated from URL hash
    url: str
    owner_username: Optional[str] = None  # Extracted from Radicale URL
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CalendarRadicaleWithShares(CalendarRadicale):
    """Calendar from Radicale with shares list."""
    shares: List[dict] = []  # Will contain share info


# Shared Calendar schemas (stored in DB)
class SharedCalendarBase(BaseModel):
    """Base shared calendar fields."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = "blue"


class SharedCalendarCreate(SharedCalendarBase):
    """Create a new shared calendar."""
    pass


class SharedCalendarInDB(SharedCalendarBase):
    """Shared calendar from database."""
    id: int
    radicale_username: str  # Generated username for Radicale
    password: str  # Generated password for Radicale
    owner: str  # Radicale username of owner
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SharedCalendarWithShares(SharedCalendarInDB):
    """Shared calendar with its shares."""
    shares: List[dict] = []


# Calendar Share schemas
class CalendarShareBase(BaseModel):
    """Base calendar share fields."""
    # user is now a string (Radicale username), not an integer ID
    user: str = Field(..., min_length=1)
    rights: str = Field(..., pattern="^(RW|RO)$")  # RW or RO


class CalendarShareCreate(CalendarShareBase):
    """Create a new calendar share."""
    pass


class CalendarShareInDB(CalendarShareBase):
    """Calendar share from database."""
    id: int
    shared_calendar_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Calendar with sharing info (for frontend)
class CalendarWithSharingInfo(BaseModel):
    """Calendar with full sharing information."""
    id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = "blue"
    owner: str  # Radicale username of owner
    radicale_username: Optional[str] = None  # For shared calendars
    password: Optional[str] = None  # For shared calendars
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_owner: bool = False
    permission: str = "RO"  # RW or RO
    is_shared: bool = False

    class Config:
        from_attributes = True
