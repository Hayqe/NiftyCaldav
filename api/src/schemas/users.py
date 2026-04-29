from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role: Optional[str] = "user"


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    password: Optional[str] = Field(None, min_length=6)
    role: Optional[str] = None


class UserInDB(UserBase):
    id: int
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserSettingsBase(BaseModel):
    calendar_colors: Optional[str] = None
    notifications_enabled: Optional[bool] = False
    timezone: Optional[str] = "Europe/Amsterdam"
    language: Optional[str] = "nl"
    default_view: Optional[str] = "month"
    highlight_weekend: Optional[bool] = False
    weekend_color: Optional[str] = "#FEF9C3"


class UserSettingsUpdate(UserSettingsBase):
    pass


class UserSettingsInDB(UserSettingsBase):
    user_id: int

    class Config:
        from_attributes = True
