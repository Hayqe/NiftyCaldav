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


# Radicale-only calendar schema (no database ID)
class CalendarRadicale(BaseModel):
    name: str
    url: str
    description: Optional[str] = None
    color: Optional[str] = None
    owner_username: Optional[str] = None  # Extracted from URL

    class Config:
        from_attributes = True


class CalendarRadicaleWithShares(CalendarRadicale):
    shares: List[CalendarShareInDB] = []
