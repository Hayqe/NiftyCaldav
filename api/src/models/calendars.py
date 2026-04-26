from sqlalchemy import Column, Integer, String, TEXT, TIMESTAMP, func, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import relationship
from ..database import Base


class Calendar(Base):
    __tablename__ = "calendars"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(TEXT)
    color = Column(String, default="blue")  # Store calendar color (e.g., "blue", "red", "green")
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="calendars")
    shares = relationship("CalendarShare", back_populates="calendar", cascade="all, delete-orphan")


class CalendarShare(Base):
    __tablename__ = "calendar_shares"

    calendar_id = Column(Integer, ForeignKey("calendars.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission = Column(String, nullable=False)  # 'read', 'write', 'admin'
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Composite primary key
    __table_args__ = (
        PrimaryKeyConstraint('calendar_id', 'user_id'),
    )

    # Relationships
    calendar = relationship("Calendar", back_populates="shares")
    user = relationship("User", back_populates="shared_calendars")
