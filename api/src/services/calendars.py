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

    @staticmethod
    def create_calendar(db: Session, calendar: CalendarCreate, owner_id: int) -> dict:
        """Create calendar directly in Radicale."""
        # We ignore DB and use Radicale as Source of Truth
        from ..models import User
        user = db.query(User).filter(User.id == owner_id).first()
        if not user:
            raise Exception("User not found")
            
        return CalendarService.create_calendar_radicale(calendar, user.username)

    @staticmethod
    def update_calendar(db: Session, calendar_id: int, calendar: CalendarUpdate, owner_id: int) -> Optional[dict]:
        """Update calendar directly in Radicale (not supported)."""
        return None

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

    @staticmethod
    def has_write_permission(db: Session, calendar_id: int, user_id: int) -> bool:
        """
        Check if user has write permission on a calendar.
        Returns True if:
        - User is the owner of the calendar
        - User has a share with 'write' or 'admin' permission on the calendar
        """
        # Check if user is owner
        calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
        if calendar and calendar.owner_id == user_id:
            return True
        
        # Check if user has write or admin permission via share
        share = (
            db.query(CalendarShare)
            .filter(
                CalendarShare.calendar_id == calendar_id,
                CalendarShare.user_id == user_id
            )
            .first()
        )
        
        if share and share.permission in ['write', 'admin']:
            return True
        
        return False

    @staticmethod
    def has_read_permission(db: Session, calendar_id: int, user_id: int) -> bool:
        """
        Check if user has at least read permission on a calendar.
        Returns True if:
        - User is the owner of the calendar
        - User has a share with 'read', 'write', or 'admin' permission on the calendar
        """
        # Check if user is owner
        calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
        if calendar and calendar.owner_id == user_id:
            return True
        
        # Check if user has any permission via share
        share = (
            db.query(CalendarShare)
            .filter(
                CalendarShare.calendar_id == calendar_id,
                CalendarShare.user_id == user_id
            )
            .first()
        )
        
        if share and share.permission in ['read', 'write', 'admin']:
            return True
        
        return False

    @staticmethod
    def get_calendar_with_credentials(db: Session, calendar_id: int, user_id: int) -> Optional[dict]:
        """
        Get calendar info with credentials for shared calendars.
        Returns calendar info including generated_username and generated_password if user has access.
        """
        from ..models import User as UserModel
        
        # Check if calendar exists
        calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
        if not calendar:
            return None
        
        # Check if user is owner
        if calendar.owner_id == user_id:
            # For owner, get the owner's user info
            owner = db.query(UserModel).filter(UserModel.id == calendar.owner_id).first()
            return {
                'id': calendar.id,
                'name': calendar.name,
                'description': calendar.description,
                'color': calendar.color,
                'owner_id': calendar.owner_id,
                'owner_username': owner.username if owner else None,
                'generated_username': None,
                'generated_password': None,
                'is_owner': True,
                'permission': 'admin'
            }
        
        # Check if user has share access
        share = (
            db.query(CalendarShare)
            .filter(
                CalendarShare.calendar_id == calendar_id,
                CalendarShare.user_id == user_id
            )
            .first()
        )
        
        if share:
            # Get the system user for this calendar (the owner of the calendar is the system user)
            owner = db.query(UserModel).filter(UserModel.id == calendar.owner_id).first()
            return {
                'id': calendar.id,
                'name': calendar.name,
                'description': calendar.description,
                'color': calendar.color,
                'owner_id': calendar.owner_id,
                'owner_username': owner.username if owner else None,
                'generated_username': owner.username if owner else None,
                'generated_password': 'admin',  # This should be stored in the calendar or user_settings
                'is_owner': False,
                'permission': share.permission
            }
        
        return None

    @staticmethod
    def get_my_and_shared_calendars(db: Session, user_id: int) -> List[dict]:
        """
        Get all calendars that a user has access to (own + shared).
        Returns calendar info with credentials for accessing via CalDAV.
        """
        from ..models import User as UserModel
        
        # Get user's own calendars
        my_calendars = (
            db.query(Calendar)
            .filter(Calendar.owner_id == user_id)
            .all()
        )
        
        # Get shared calendars
        shared_calendars = (
            db.query(CalendarShare)
            .filter(CalendarShare.user_id == user_id)
            .all()
        )
        
        result = []
        
        # Add own calendars
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        for calendar in my_calendars:
            result.append({
                'id': calendar.id,
                'name': calendar.name,
                'description': calendar.description,
                'color': calendar.color,
                'owner_id': calendar.owner_id,
                'owner_username': user.username if user else None,
                'generated_username': calendar.system_username,
                'generated_password': calendar.system_password,
                'is_owner': True,
                'permission': 'admin',
                'is_shared': calendar.is_shared_calendar,
                'system_username': calendar.system_username,
                'system_password': calendar.system_password
            })
        
        # Add shared calendars with credentials
        for share in shared_calendars:
            calendar = share.calendar
            owner = db.query(UserModel).filter(UserModel.id == calendar.owner_id).first()
            result.append({
                'id': calendar.id,
                'name': calendar.name,
                'description': calendar.description,
                'color': calendar.color,
                'owner_id': calendar.owner_id,
                'owner_username': owner.username if owner else None,
                'generated_username': calendar.system_username,
                'generated_password': calendar.system_password,
                'is_owner': False,
                'permission': share.permission,
                'is_shared': True,
                'system_username': calendar.system_username,
                'system_password': calendar.system_password
            })
        
        return result

    @staticmethod
    def get_all_shared_calendars_for_user(db: Session, user_id: int) -> List[dict]:
        """
        Get all shared calendars for a user:
        - Calendars owned by the user that are marked as shared
        - Calendars shared with the user by others
        """
        from ..models import User as UserModel
        
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            return []
        
        result = []
        
        # Get calendars owned by this user that are shared
        owned_shared = (
            db.query(Calendar)
            .filter(Calendar.owner_id == user_id, Calendar.is_shared_calendar == True)
            .all()
        )
        
        for calendar in owned_shared:
            result.append({
                'id': calendar.id,
                'name': calendar.name,
                'description': calendar.description,
                'color': calendar.color,
                'owner_id': calendar.owner_id,
                'owner_username': user.username,
                'created_at': calendar.created_at,
                'updated_at': calendar.updated_at,
                'generated_username': calendar.system_username,
                'generated_password': calendar.system_password,
                'is_owner': True,
                'permission': 'admin',
                'is_shared': True,
                'system_username': calendar.system_username,
                'system_password': calendar.system_password
            })
        
        # Get calendars shared with this user
        shared_with_me = (
            db.query(CalendarShare)
            .filter(CalendarShare.user_id == user_id)
            .all()
        )
        
        for share in shared_with_me:
            calendar = share.calendar
            owner = db.query(UserModel).filter(UserModel.id == calendar.owner_id).first()
            result.append({
                'id': calendar.id,
                'name': calendar.name,
                'description': calendar.description,
                'color': calendar.color,
                'owner_id': calendar.owner_id,
                'owner_username': owner.username if owner else None,
                'created_at': calendar.created_at,
                'updated_at': calendar.updated_at,
                'generated_username': calendar.system_username,
                'generated_password': calendar.system_password,
                'is_owner': False,
                'permission': share.permission,
                'is_shared': True,
                'system_username': calendar.system_username,
                'system_password': calendar.system_password
            })
        
        return result
