from typing import Optional, List
from sqlalchemy.orm import Session
from ..models import User, UserSettings
from .auth import AuthService
from ..schemas.users import UserCreate, UserUpdate


class UserService:
    @staticmethod
    def get_user(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return (
            db.query(User)
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def create_user(db: Session, user: UserCreate) -> User:
        hashed_password = AuthService.hash_password(user.password)
        db_user = User(
            username=user.username,
            password_hash=hashed_password,
            role=user.role or "user"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def update_user(db: Session, user_id: int, user: UserUpdate) -> Optional[User]:
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            return None

        if user.username:
            db_user.username = user.username
        if user.password:
            db_user.password_hash = AuthService.hash_password(user.password)
        if user.role:
            db_user.role = user.role

        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            return False

        db.delete(db_user)
        db.commit()
        return True

    @staticmethod
    def get_or_create_user_settings(db: Session, user_id: int) -> UserSettings:
        settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        if settings:
            return settings

        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
        return settings

    @staticmethod
    def update_user_settings(db: Session, user_id: int, settings_data: dict) -> Optional[UserSettings]:
        settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        if not settings:
            return None

        for key, value in settings_data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)

        db.commit()
        db.refresh(settings)
        return settings
