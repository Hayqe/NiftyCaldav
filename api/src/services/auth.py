import os
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict
import jwt

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# In-memory cache for user passwords (username -> password)
# This is populated at login time
_user_password_cache: Dict[str, str] = {}


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


class AuthService:
    @staticmethod
    def create_token(username: str, role: str) -> str:
        """
        Create JWT token for authenticated user.
        
        Note: Token now contains username (string) instead of user_id (int).
        The sub field is removed since we use username directly.
        """
        expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "username": username,
            "role": role
        }
        return create_access_token(token_data, expires)

    @staticmethod
    def verify_token(token: str) -> dict:
        """Verify JWT token and return payload."""
        return decode_access_token(token)
    
    @staticmethod
    def authenticate_with_radicale(username: str, password: str) -> Tuple[bool, str]:
        """
        Authenticate user credentials directly against Radicale.
        
        Returns:
            Tuple of (success: bool, role: str)
            role defaults to "user" if not determinable from Radicale
        """
        from .caldav_client import CalDAVClient
        
        client = CalDAVClient()
        if client.connect(username, password):
            # Store password in cache for later use with CalDAV operations
            global _user_password_cache
            _user_password_cache[username] = password
            
            # For now, we determine role based on username
            # In production, you might have a way to get role from Radicale
            # or maintain a separate role mapping
            # Default to "user", admin is determined by username
            if username == "admin":
                return True, "admin"
            return True, "user"
        
        return False, ""
    
    @staticmethod
    def get_user_info_from_token(token: str) -> dict:
        """
        Extract user info from JWT token without DB lookup.
        
        Returns dict with:
            - username: str
            - role: str
        """
        payload = AuthService.verify_token(token)
        if not payload:
            return None
        
        return {
            "username": payload.get("username"),
            "role": payload.get("role", "user")
        }

    @staticmethod
    def get_password_for_user(username: str) -> Optional[str]:
        """
        Get the cached password for a user.
        Returns the password if cached, None otherwise.
        """
        global _user_password_cache
        return _user_password_cache.get(username)
