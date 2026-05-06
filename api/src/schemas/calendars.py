from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CalendarBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = "blue"


class CalendarCreate(CalendarBase):
    pass


class CalendarUpdate(CalendarBase):
    pass


class CalendarInDB(CalendarBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    # Optional fields for shared calendars
    system_username: Optional[str] = None
    system_password: Optional[str] = None
    is_shared_calendar: bool = False

    class Config:
        from_attributes = True


class CalendarShareBase(BaseModel):
    user_id: int
    permission: str = Field(..., pattern="^(read|write|admin)$")


class CalendarShareCreate(CalendarShareBase):
    pass


class CalendarShareInDB(CalendarShareBase):
    calendar_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CalendarWithShares(CalendarInDB):
    shares: List[CalendarShareInDB] = []


# Radicale-only calendar schema with virtual ID for frontend compatibility
class CalendarRadicale(CalendarBase):
    id: int  # Virtual ID generated from URL hash
    url: str
    owner_id: int = 1  # Default, will be set based on owner_username
    owner_username: Optional[str] = None  # Extracted from URL
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CalendarRadicaleWithShares(CalendarRadicale):
    shares: List[CalendarShareInDB] = []


# Calendar with full sharing info
class CalendarWithSharingInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = "blue"
    owner_id: int
    owner_username: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Sharing fields
    system_username: Optional[str] = None
    system_password: Optional[str] = None
    is_owner: bool = False
    permission: str = "read"
    is_shared: bool = False

    class Config:
        from_attributes = True
