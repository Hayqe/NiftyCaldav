from typing import Optional, List
from sqlalchemy.orm import Session
from ..models import UserSettings


class UserService:
    @staticmethod
    def get_all_radicale_users_via_api() -> List[str]:
        """Get all users from Radicale server via CalDAV API.
        
        Only works if admin password is cached (from login).
        Returns empty list if admin credentials are not available.
        """
        from .caldav_client import CalDAVClient
        from .auth import AuthService
        
        # Get admin credentials from cache - NO fallback to hardcoded password
        admin_password = AuthService.get_password_for_user("admin")
        
        if not admin_password:
            # Admin password not in cache - cannot sync
            print("Admin password not cached. Cannot sync users with Radicale.")
            return []
        
        client = CalDAVClient()
        if not client.connect("admin", admin_password):
            print("Failed to connect to Radicale as admin.")
            return []
        
        return CalDAVClient.get_all_radicale_users(client)
    """
    Service for managing user settings.
    
    Note: User authentication and management is handled by Radicale.
    This service only manages user settings stored in the database.
    """
    
    @staticmethod
    def get_otp_flag(db: Session, username: str) -> bool:
        """
        Check if OTP flag is set for a user.
        
        Args:
            db: Database session
            username: Radicale username
        
        Returns:
            True if otp flag is set, False otherwise
        """
        settings = db.query(UserSettings).filter_by(radicale_username=username).first()
        if settings:
            return settings.otp
        return False
    
    @staticmethod
    def get_or_create_user_settings(db: Session, username: str) -> UserSettings:
        """
        Get user settings for a username, or create with defaults.
        
        Args:
            db: Database session
            username: Radicale username
        
        Returns:
            UserSettings object
        """
        settings = db.query(UserSettings).filter_by(radicale_username=username).first()
        if settings:
            return settings
        
        # Create with defaults
        settings = UserSettings(radicale_username=username)
        db.add(settings)
        db.commit()
        db.refresh(settings)
        return settings
    
    @staticmethod
    def get_user_settings(db: Session, username: str) -> Optional[UserSettings]:
        """
        Get user settings for a username.
        
        Args:
            db: Database session
            username: Radicale username
        
        Returns:
            UserSettings object or None
        """
        return db.query(UserSettings).filter_by(radicale_username=username).first()
    
    @staticmethod
    def update_user_settings(db: Session, username: str, settings_data: dict) -> Optional[UserSettings]:
        """
        Update user settings for a username.
        
        Args:
            db: Database session
            username: Radicale username
            settings_data: Dict of settings to update
        
        Returns:
            Updated UserSettings object or None
        """
        settings = db.query(UserSettings).filter_by(radicale_username=username).first()
        if not settings:
            return None
        
        for key, value in settings_data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        
        db.commit()
        db.refresh(settings)
        return settings
