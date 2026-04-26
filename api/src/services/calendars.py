from typing import Optional, List
from sqlalchemy.orm import Session
from ..models import Calendar, CalendarShare
from .caldav_client import CalDAVClient
from ..schemas.calendars import CalendarCreate, CalendarUpdate, CalendarShareCreate


class CalendarService:
    @staticmethod
    def get_calendar(db: Session, calendar_id: int) -> Optional[Calendar]:
        return db.query(Calendar).filter(Calendar.id == calendar_id).first()

    @staticmethod
    def get_calendars_by_owner(db: Session, owner_id: int, skip: int = 0, limit: int = 100) -> List[Calendar]:
        return (
            db.query(Calendar)
            .filter(Calendar.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_all_calendars(db: Session, skip: int = 0, limit: int = 100) -> List[Calendar]:
        return (
            db.query(Calendar)
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def create_calendar(db: Session, calendar: CalendarCreate, owner_id: int) -> Calendar:
        db_calendar = Calendar(
            name=calendar.name,
            description=calendar.description or None,
            owner_id=owner_id
        )
        db.add(db_calendar)
        db.commit()
        db.refresh(db_calendar)
        
        # Also create the calendar in CalDAV
        try:
            from ..models import User
            user = db.query(User).filter(User.id == owner_id).first()
            if user:
                # Need to reconnect to ensure we have fresh connection
                client = CalDAVClient()
                if client.connect(user.username, "admin"):
                    if not client.calendar_exists(calendar.name):
                        client.create_calendar(calendar.name, calendar.description)
        except Exception as e:
            print(f"Warning: Could not create calendar in CalDAV: {e}")
        
        return db_calendar

    @staticmethod
    def update_calendar(db: Session, calendar_id: int, calendar: CalendarUpdate, owner_id: int) -> Optional[Calendar]:
        db_calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
        if not db_calendar:
            return None
        
        # Check if user is owner or admin
        if db_calendar.owner_id != owner_id:
            return None

        if calendar.name:
            db_calendar.name = calendar.name
        if calendar.description is not None:
            db_calendar.description = calendar.description
        if calendar.color is not None:
            db_calendar.color = calendar.color

        db.commit()
        db.refresh(db_calendar)
        return db_calendar

    @staticmethod
    def delete_calendar(db: Session, calendar_id: int, owner_id: int) -> bool:
        db_calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
        if not db_calendar:
            return False
        
        # Check if user is owner or admin
        if db_calendar.owner_id != owner_id:
            return False

        # Also delete from CalDAV
        try:
            from ..models import User
            user = db.query(User).filter(User.id == owner_id).first()
            if user:
                client = CalDAVClient()
                if client.connect(user.username, "admin"):
                    client.delete_calendar(db_calendar.name)
        except Exception as e:
            print(f"Warning: Could not delete calendar from CalDAV: {e}")

        db.delete(db_calendar)
        db.commit()
        return True

    # Calendar Share methods
    @staticmethod
    def get_shares_for_calendar(db: Session, calendar_id: int) -> List[CalendarShare]:
        return (
            db.query(CalendarShare)
            .filter(CalendarShare.calendar_id == calendar_id)
            .all()
        )

    @staticmethod
    def get_shared_calendars_for_user(db: Session, user_id: int) -> List[Calendar]:
        shares = (
            db.query(CalendarShare)
            .filter(CalendarShare.user_id == user_id)
            .all()
        )
        return [share.calendar for share in shares]

    @staticmethod
    def create_share(db: Session, calendar_id: int, share: CalendarShareCreate, owner_id: int) -> Optional[CalendarShare]:
        # Verify owner owns the calendar
        calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
        if not calendar or calendar.owner_id != owner_id:
            return None

        # Check for existing share
        existing = (
            db.query(CalendarShare)
            .filter(
                CalendarShare.calendar_id == calendar_id,
                CalendarShare.user_id == share.user_id
            )
            .first()
        )
        
        if existing:
            existing.permission = share.permission
            db.commit()
            db.refresh(existing)
            return existing

        db_share = CalendarShare(
            calendar_id=calendar_id,
            user_id=share.user_id,
            permission=share.permission
        )
        db.add(db_share)
        db.commit()
        db.refresh(db_share)
        return db_share

    @staticmethod
    def update_share(db: Session, calendar_id: int, user_id: int, permission: str, owner_id: int) -> Optional[CalendarShare]:
        # Verify owner owns the calendar
        calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
        if not calendar or calendar.owner_id != owner_id:
            return None

        db_share = (
            db.query(CalendarShare)
            .filter(
                CalendarShare.calendar_id == calendar_id,
                CalendarShare.user_id == user_id
            )
            .first()
        )
        
        if not db_share:
            return None

        db_share.permission = permission
        db.commit()
        db.refresh(db_share)
        return db_share

    @staticmethod
    def delete_share(db: Session, calendar_id: int, user_id: int, owner_id: int) -> bool:
        # Verify owner owns the calendar
        calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
        if not calendar or calendar.owner_id != owner_id:
            return False

        db_share = (
            db.query(CalendarShare)
            .filter(
                CalendarShare.calendar_id == calendar_id,
                CalendarShare.user_id == user_id
            )
            .first()
        )
        
        if not db_share:
            return False

        db.delete(db_share)
        db.commit()
        return True
