import random
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from ..models import User, UserSettings
from .auth import AuthService
from ..schemas.users import UserCreate, UserUpdate


# List of Dutch words for one-time password generation
ONE_TIME_PASSWORD_WORDS = [
    "appel", "boom", "auto", "huis", "kat", "hond", "vis", "roos", "zon", "maand",
    "ster", "water", "vuur", "wind", "land", "zee", "berg", "pad", "weg", "brug",
    "boot", "vlieg", "trein", "bus", "fiets", "lopen", "spring", "zomer", "winter", "herfst",
    "lente", "regen", "sneeuw", "ijzel", "wolk", "hemel", "aarde", "ruimte", "licht", "duister",
    "goud", "zilver", "brons", "hout", "steen", "staal", "glas", "papier", "boek", "pen",
    "tafel", "stoel", "bed", "deur", "raam", "muur", "dak", "vloer", "trap", "lift",
    "kast", "spiegel", "lamp", "klok", "telefoon", "computer", "scherm", "toets", "muis", "printer",
    "kabel", "stekker", "batterij", "camera", "foto", "video", "geluid", "muziek", "lied", "zang",
    "dans", "feest", "cadeau", "taart", "koek", "brood", "melk", "kaas", "eieren", "vlees",
    "visch", "rijst", "pasta", "soep", "salade", "fruit", "groen", "rood", "blauw", "geel",
    "groen", "zwart", "wit", "grijs", "paars", "roze", "bruin", "oranje", "kleur", "kleding",
    "schoen", "hoed", "jas", "broek", "shirt", "rok", "jurk", "das", "riem", "tas",
    "portemonnee", "sleutel", "slot", "deur", "kast", "lade", "bak", "fles", "glas", "beker",
    "bord", "mes", "vork", "lepel", "pan", "ketel", "oven", "koelkast", "vriezer", "afwas",
    "sop", "zeep", "hand", "voet", "hoofd", "oog", "oor", "neus", "mond", "tand",
    "haar", "huid", "been", "arm", "rug", "buik", "hart", "long", "bloed", "bot",
]


class UserService:
    @staticmethod
    def generate_one_time_password() -> str:
        """Generate a one-time password consisting of three random Dutch words separated by hyphens."""
        words = random.sample(ONE_TIME_PASSWORD_WORDS, 3)
        return "-".join(words)

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
    def create_user_with_otp(db: Session, username: str, role: str = "user") -> Tuple[User, str]:
        """
        Create a new user with a one-time password.
        Returns the user and the one-time password.
        """
        one_time_password = UserService.generate_one_time_password()
        hashed_password = AuthService.hash_password(one_time_password)
        
        db_user = User(
            username=username,
            password_hash=hashed_password,
            role=role,
            must_change_password=True
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user, one_time_password

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
    def reset_user_password(db: Session, user_id: int) -> Tuple[Optional[User], Optional[str]]:
        """
        Reset a user's password to a new one-time password.
        Sets must_change_password flag to True.
        Returns the user and the new one-time password.
        """
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            return None, None

        one_time_password = UserService.generate_one_time_password()
        db_user.password_hash = AuthService.hash_password(one_time_password)
        db_user.must_change_password = True

        db.commit()
        db.refresh(db_user)
        return db_user, one_time_password

    @staticmethod
    def change_password(db: Session, user_id: int, new_password: str, verify_current: Optional[str] = None) -> Optional[User]:
        """
        Change a user's password.
        If verify_current is provided, verifies the current password first.
        Sets must_change_password to False after successful change.
        """
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            return None

        # If verifying current password, check it
        if verify_current:
            if not AuthService.verify_password(verify_current, db_user.password_hash):
                return None

        db_user.password_hash = AuthService.hash_password(new_password)
        db_user.must_change_password = False

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
