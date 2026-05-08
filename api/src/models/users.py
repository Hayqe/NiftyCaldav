from sqlalchemy import Column, String, Boolean, Integer, TIMESTAMP, func
from ..database import Base


class UserSettings(Base):
    """
    User settings stored in database, keyed by Radicale username.
    
    Since authentication is handled exclusively by Radicale, we use
    radicale_username as the primary key instead of a foreign key to users.id.
    """
    __tablename__ = "user_settings"

    # Primary key is the Radicale username (string), not a numeric ID
    radicale_username = Column(String, primary_key=True, index=True)
    calendar_colors = Column(String)
    notifications_enabled = Column(Boolean, default=False)
    timezone = Column(String, default="Europe/Amsterdam")
    language = Column(String, default="nl")
    default_view = Column(String, default="month")
    highlight_weekend = Column(Boolean, default=False)
    weekend_color = Column(String, default="#FEF9C3")  # light yellow
    default_duration = Column(Integer, default=60)  # minutes
    default_calendar = Column(String)  # Default calendar for user
    show_week_numbers = Column(Boolean, default=False)
    otp = Column(Boolean, default=False)  # One-time password flag: True = user must change password
