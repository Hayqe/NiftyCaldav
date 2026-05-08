from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Annotated, Optional, Dict, Any

from ..database import get_db
from ..services.auth import AuthService

security = HTTPBearer()


def get_current_user_info(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> Dict[str, Any]:
    """
    Get user info directly from JWT token without database lookup.
    
    Returns dict with:
        - username: str (from token)
        - role: str (from token)
    """
    token = credentials.credentials
    payload = AuthService.verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username = payload.get("username")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {
        "username": username,
        "role": payload.get("role", "user")
    }


def get_current_user(
    request: Request,
    user_info: Dict[str, Any] = Depends(get_current_user_info)
) -> Dict[str, Any]:
    """
    Get the current authenticated user from JWT token.
    
    Returns dict with username and role.
    All authenticated users pass through this.
    """
    return user_info


def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Ensure the current user is active (not disabled).
    All users are currently active in this implementation.
    """
    return current_user


def get_current_user_from_token(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> Dict[str, Any]:
    """
    Get user info directly from JWT token without database lookup.
    Same as get_current_user_info but with Request parameter for compatibility.
    """
    return get_current_user_info(credentials)


def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_active_user)) -> Dict[str, Any]:
    """
    Ensure the current user has admin privileges.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


def get_username_from_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> str:
    """
    Extract just the username from the JWT token.
    """
    user_info = get_current_user_info(credentials)
    return user_info["username"]
