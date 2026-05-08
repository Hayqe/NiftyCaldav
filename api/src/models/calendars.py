from sqlalchemy import Column, Integer, String, TEXT, TIMESTAMP, func, ForeignKey, Enum
from sqlalchemy.orm import relationship
from ..database import Base


class SharedCalendar(Base):
    """
    Represents a shared calendar with generated Radicale credentials.
    
    When a user wants to share a calendar with others, we create a new
    Radicale user (with generated username/password) and store the
    credentials here. The owner is the Radicale username of the user
    who created the shared calendar.
    """
    __tablename__ = "shared_calendars"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(TEXT)
    color = Column(String, default="blue")
    
    # Generated Radicale credentials for this shared calendar
    radicale_username = Column(String, unique=True, nullable=False)  # e.g., "shared-abc123"
    password = Column(String, nullable=False)  # Random password
    
    # The owner is the Radicale username (string) of the user who created this
    owner = Column(String, nullable=False)  # Radicale username, not DB ID
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    shares = relationship("CalendarShare", back_populates="shared_calendar", cascade="all, delete-orphan")


class CalendarShare(Base):
    """
    Maps a shared calendar to a user with specific permissions.
    
    The user field is a Radicale username (string), NOT a numeric user ID.
    This allows sharing with any Radicale user without needing to store
    them in our database.
    """
    __tablename__ = "calendar_shares"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    shared_calendar_id = Column(Integer, ForeignKey("shared_calendars.id", ondelete="CASCADE"), nullable=False)
    
    # User is a Radicale username (string), not a numeric ID
    user = Column(String, nullable=False)  # Radicale username
    
    # Permissions: RW (read-write) or RO (read-only)
    rights = Column(Enum("RW", "RO", name="calendar_rights"), nullable=False, default="RO")
    
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    shared_calendar = relationship("SharedCalendar", back_populates="shares")
