from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user info - now comes from JWT token (Radicale auth)."""
    username: str = Field(..., min_length=1)


class UserInDB(UserBase):
    """User information returned from API (from token, not DB)."""
    role: str
    must_change_password: bool = False

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
    default_duration: Optional[int] = 60
    default_calendar: Optional[str] = None
    show_week_numbers: Optional[bool] = False
    otp: Optional[bool] = False


class UserSettingsUpdate(UserSettingsBase):
    """Update for user settings - all fields optional."""
    pass


class UserSettingsInDB(UserSettingsBase):
    """User settings with primary key (radicale_username)."""
    radicale_username: str  # Primary key: Radicale username

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    """Schema for password change - note: password changes happen in Radicale, not DB."""
    current_password: Optional[str] = None
    new_password: str = Field(..., min_length=6)


class PasswordChangeResponse(BaseModel):
    """Response after password change."""
    message: str
    must_change_password: bool = False


class UserCreate(BaseModel):
    """Schema for creating a new user in Radicale."""
    username: str = Field(..., min_length=1, description="Username for the new user")
    password: Optional[str] = Field(
        None, 
        min_length=8, 
        description="Password for the new user. If not provided, a random password will be generated."
    )
    role: str = Field("user", description="User role: 'admin' or 'user'")


class UserCreateResponse(BaseModel):
    """Response after creating a user."""
    username: str
    password: str
    otp: bool = True
    message: str


class UserResetPasswordResponse(BaseModel):
    """Response after resetting a user's password."""
    username: str
    new_password: str
    otp: bool = True
    message: str
