from typing import Optional, List
from sqlalchemy.orm import Session
from ..models import SharedCalendar, CalendarShare
from .caldav_client import CalDAVClient
from ..schemas.calendars import CalendarCreate


class CalendarService:
    @staticmethod
    def create_calendar_radicale(calendar: CalendarCreate, username: str) -> dict:
        """Create calendar directly in Radicale (no database)."""
        client = CalDAVClient()
        if not client.connect(username, "admin"):
            raise Exception("Failed to connect to CalDAV")
        
        if client.calendar_exists(calendar.name):
            raise Exception(f"Calendar '{calendar.name}' already exists")
        
        if not client.create_calendar(calendar.name, calendar.description, calendar.color):
            raise Exception(f"Failed to create calendar '{calendar.name}' in Radicale")        
        # Return fresh calendar info from Radicale
        calendars = client.get_calendars()
        for cal in calendars:
            if cal['name'] == calendar.name or cal['url'].endswith(f"/{calendar.name}/"):
                return cal
                
        # Fallback if for some reason listing fails right after creation
        cal = client.get_calendar(calendar.name)
        cal_url = str(cal.url) if cal else f"{client.radicale_url}/{username}/{calendar.name}/"
        return {
            "name": calendar.name,
            "url": cal_url,
            "description": calendar.description,
            "color": calendar.color or "blue",
            "owner_username": username
        }
    
    # Shared Calendar methods
    @staticmethod
    def get_shared_calendar(db: Session, calendar_id: int) -> Optional[SharedCalendar]:
        """Get a shared calendar by ID."""
        return db.query(SharedCalendar).filter(SharedCalendar.id == calendar_id).first()
    
    @staticmethod
    def get_shared_calendars_by_owner(db: Session, owner: str) -> List[SharedCalendar]:
        """Get all shared calendars owned by a user."""
        return db.query(SharedCalendar).filter(SharedCalendar.owner == owner).all()
    
    @staticmethod
    def get_shared_calendars_shared_with_user(db: Session, user: str) -> List[SharedCalendar]:
        """Get all shared calendars that are shared with a user."""
        # Get all shares for this user
        shares = db.query(CalendarShare).filter(CalendarShare.user == user).all()
        return [share.shared_calendar for share in shares]
    
    @staticmethod
    def user_has_access(db: Session, calendar_id: int, username: str) -> bool:
        """Check if a user has access to a shared calendar (is owner or has share)."""
        calendar = db.query(SharedCalendar).filter(SharedCalendar.id == calendar_id).first()
        if not calendar:
            return False
        
        # Check if user is owner
        if calendar.owner == username:
            return True
        
        # Check if user has a share
        share = db.query(CalendarShare).filter(
            CalendarShare.shared_calendar_id == calendar_id,
            CalendarShare.user == username
        ).first()
        
        return share is not None
    
    @staticmethod
    def has_write_permission_shared(db: Session, calendar_id: int, username: str) -> bool:
        """
        Check if user has write permission on a shared calendar.
        Returns True if:
        - User is the owner of the calendar
        - User has a share with 'RW' permission on the calendar
        """
        # Check if user is owner
        calendar = db.query(SharedCalendar).filter(SharedCalendar.id == calendar_id).first()
        if calendar and calendar.owner == username:
            return True
        
        # Check if user has RW permission via share
        share = db.query(CalendarShare).filter(
            CalendarShare.shared_calendar_id == calendar_id,
            CalendarShare.user == username
        ).first()
        
        if share and share.rights == "RW":
            return True
        
        return False
    
    @staticmethod
    def has_read_permission_shared(db: Session, calendar_id: int, username: str) -> bool:
        """
        Check if user has at least read permission on a shared calendar.
        Returns True if:
        - User is the owner of the calendar
        - User has a share with 'RW' or 'RO' permission on the calendar
        """
        # Check if user is owner
        calendar = db.query(SharedCalendar).filter(SharedCalendar.id == calendar_id).first()
        if calendar and calendar.owner == username:
            return True
        
        # Check if user has any permission via share
        share = db.query(CalendarShare).filter(
            CalendarShare.shared_calendar_id == calendar_id,
            CalendarShare.user == username
        ).first()
        
        if share and share.rights in ["RW", "RO"]:
            return True
        
        return False
    
    @staticmethod
    def get_shares_for_calendar(db: Session, calendar_id: int) -> List[CalendarShare]:
        """Get all shares for a shared calendar."""
        return (
            db.query(CalendarShare)
            .filter(CalendarShare.shared_calendar_id == calendar_id)
            .all()
        )
    
    @staticmethod
    def get_shared_calendars_for_user(db: Session, username: str) -> List[dict]:
        """
        Get all shared calendars for a user (owned + shared with them).
        Returns list of dicts with calendar info and share info.
        """
        result = []
        
        # Get calendars owned by this user
        owned = (
            db.query(SharedCalendar)
            .filter(SharedCalendar.owner == username)
            .all()
        )
        
        for calendar in owned:
            result.append({
                'id': calendar.id,
                'name': calendar.name,
                'description': calendar.description,
                'color': calendar.color,
                'owner': calendar.owner,
                'radicale_username': calendar.radicale_username,
                'password': calendar.password,
                'created_at': calendar.created_at,
                'updated_at': calendar.updated_at,
                'is_owner': True,
                'permission': 'RW',
                'is_shared': True
            })
        
        # Get calendars shared with this user
        shares = (
            db.query(CalendarShare)
            .filter(CalendarShare.user == username)
            .all()
        )
        
        for share in shares:
            calendar = share.shared_calendar
            result.append({
                'id': calendar.id,
                'name': calendar.name,
                'description': calendar.description,
                'color': calendar.color,
                'owner': calendar.owner,
                'radicale_username': calendar.radicale_username,
                'password': calendar.password,
                'created_at': calendar.created_at,
                'updated_at': calendar.updated_at,
                'is_owner': False,
                'permission': share.rights,
                'is_shared': True
            })
        
        return result
    
    @staticmethod
    def get_all_shared_calendars_for_user(db: Session, username: str) -> List[dict]:
        """
        Get all shared calendars for a user with full info.
        Alias for get_shared_calendars_for_user for compatibility.
        """
        return CalendarService.get_shared_calendars_for_user(db, username)
    
    @staticmethod
    def create_share(db: Session, calendar_id: int, share, owner_username: str) -> Optional[CalendarShare]:
        """Create a share for a shared calendar.
        
        Args:
            share: Either a dict or a Pydantic model with 'user' and 'rights' attributes
        """
        # Verify owner owns the calendar
        calendar = db.query(SharedCalendar).filter(SharedCalendar.id == calendar_id).first()
        if not calendar or calendar.owner != owner_username:
            return None
        
        # Extract user and rights from share (handles both dict and Pydantic model)
        if isinstance(share, dict):
            user = share.get("user")
            rights = share.get("rights", "RO")
        else:
            # Pydantic model or ORM object
            user = share.user
            rights = getattr(share, 'rights', "RO")
        
        # Check for existing share
        existing = (
            db.query(CalendarShare)
            .filter(
                CalendarShare.shared_calendar_id == calendar_id,
                CalendarShare.user == user
            )
            .first()
        )
        
        if existing:
            existing.rights = rights
            db.commit()
            db.refresh(existing)
            return existing
        
        db_share = CalendarShare(
            shared_calendar_id=calendar_id,
            user=user,
            rights=rights
        )
        db.add(db_share)
        db.commit()
        db.refresh(db_share)
        return db_share
    
    @staticmethod
    def update_share(db: Session, calendar_id: int, user: str, rights: str, owner_username: str) -> Optional[CalendarShare]:
        """Update a share for a shared calendar."""
        # Verify owner owns the calendar
        calendar = db.query(SharedCalendar).filter(SharedCalendar.id == calendar_id).first()
        if not calendar or calendar.owner != owner_username:
            return None
        
        db_share = (
            db.query(CalendarShare)
            .filter(
                CalendarShare.shared_calendar_id == calendar_id,
                CalendarShare.user == user
            )
            .first()
        )
        
        if not db_share:
            return None
        
        db_share.rights = rights
        db.commit()
        db.refresh(db_share)
        return db_share
    
    @staticmethod
    def delete_share(db: Session, calendar_id: int, user: str, owner_username: str) -> bool:
        """Delete a share for a shared calendar."""
        # Verify owner owns the calendar
        calendar = db.query(SharedCalendar).filter(SharedCalendar.id == calendar_id).first()
        if not calendar or calendar.owner != owner_username:
            return False
        
        db_share = (
            db.query(CalendarShare)
            .filter(
                CalendarShare.shared_calendar_id == calendar_id,
                CalendarShare.user == user
            )
            .first()
        )
        
        if not db_share:
            return False
        
        db.delete(db_share)
        db.commit()
        return True
