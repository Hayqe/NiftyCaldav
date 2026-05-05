from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, func, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    calendars = relationship("Calendar", back_populates="owner", cascade="all, delete-orphan")
    user_settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    shared_calendars = relationship("CalendarShare", back_populates="user", cascade="all, delete-orphan")


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    calendar_colors = Column(String)
    notifications_enabled = Column(Boolean, default=False)
    timezone = Column(String, default="Europe/Amsterdam")
    language = Column(String, default="nl")
    default_view = Column(String, default="month")
    highlight_weekend = Column(Boolean, default=False)
    weekend_color = Column(String, default="#FEF9C3") # light yellow
    default_duration = Column(Integer, default=60) # minutes
    default_calendar_id = Column(Integer, ForeignKey("calendars.id", ondelete="SET NULL"), nullable=True)
    show_week_numbers = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="user_settings")
