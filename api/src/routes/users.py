from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from ..database import get_db
from ..schemas.users import (
    UserInDB, UserSettingsInDB, UserSettingsUpdate, PasswordChange, PasswordChangeResponse,
    UserCreate, UserCreateResponse, UserResetPasswordResponse
)
from ..services.users import UserService
from ..services.radicale_users import (
    add_user_to_htpasswd, update_user_password, user_exists, generate_random_password
)
from .dependencies import get_current_active_user, get_admin_user, get_current_user_info

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/all-simple", response_model=List[str], summary="Get all users with settings (simple list)")
async def read_all_users_simple(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get a simple list of all users that have settings in the database.
    This is not a list of all Radicale users, only those who have accessed the system.
    Admin only.
    """
    from ..models import UserSettings
    users = db.query(UserSettings.radicale_username).all()
    return [user[0] for user in users]


@router.get("/me", response_model=UserInDB, summary="Get current user info")
async def read_current_user(
    current_user: Dict[str, Any] = Depends(get_current_user_info)
):
    """
    Get information about the current logged in user.
    
    Returns user info from the JWT token (which was created from Radicale auth).
    """
    return UserInDB(
        username=current_user["username"],
        role=current_user["role"],
        must_change_password=False  # This comes from login response, not here
    )


@router.get("/me/settings", response_model=UserSettingsInDB, summary="Get my user settings")
async def read_my_settings(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    Get user settings for the current user.
    Settings are keyed by radicale_username.
    """
    username = current_user["username"]
    settings = UserService.get_or_create_user_settings(db, username)
    return settings


@router.put("/me/settings", response_model=UserSettingsInDB, summary="Update my user settings")
async def update_my_settings(
    settings: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    Update user settings for the current user.
    """
    username = current_user["username"]
    updated_settings = UserService.update_user_settings(
        db, username, settings.model_dump(exclude_unset=True)
    )
    if not updated_settings:
        # Create if doesn't exist
        updated_settings = UserService.get_or_create_user_settings(db, username)
        for key, value in settings.model_dump(exclude_unset=True).items():
            if hasattr(updated_settings, key):
                setattr(updated_settings, key, value)
        db.commit()
        db.refresh(updated_settings)
    
    return updated_settings


@router.get("/{username}/settings", response_model=UserSettingsInDB, summary="Get user settings by username")
async def read_user_settings(
    username: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    Get user settings for a specific user by username.
    Admin can get any user's settings, users can only get their own.
    """
    if current_user["username"] != username and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access these settings"
        )
    
    settings = UserService.get_or_create_user_settings(db, username)
    return settings


@router.put("/{username}/settings", response_model=UserSettingsInDB, summary="Update user settings by username")
async def update_user_settings(
    username: str,
    settings: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    Update user settings for a specific user by username.
    Admin can update any user's settings, users can only update their own.
    """
    if current_user["username"] != username and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update these settings"
        )
    
    updated_settings = UserService.update_user_settings(
        db, username, settings.model_dump(exclude_unset=True)
    )
    if not updated_settings:
        # Create if doesn't exist
        updated_settings = UserService.get_or_create_user_settings(db, username)
        for key, value in settings.model_dump(exclude_unset=True).items():
            if hasattr(updated_settings, key):
                setattr(updated_settings, key, value)
        db.commit()
        db.refresh(updated_settings)
    
    return updated_settings


@router.post("/me/change-password", response_model=PasswordChangeResponse, summary="Change own password")
async def change_own_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    Change the current user's password in Radicale.
    
    Note: This is a placeholder. In production, you would need to:
    1. Update the password in Radicale's htpasswd file
    2. Clear the OTP flag
    
    For now, we just clear the OTP flag to simulate password change.
    """
    username = current_user["username"]
    
    # Clear OTP flag after password change
    settings = UserService.get_or_create_user_settings(db, username)
    settings.otp = False
    db.commit()
    db.refresh(settings)
    
    return PasswordChangeResponse(
        message="Password changed successfully (password update in Radicale not implemented)",
        must_change_password=False
    )


@router.post("/{username}/change-password", response_model=PasswordChangeResponse, summary="Change user password (admin)")
async def change_user_password(
    username: str,
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Change another user's password (admin only).
    
    Note: This is a placeholder. Actual password change in Radicale is not implemented.
    """
    # Clear OTP flag
    settings = UserService.get_or_create_user_settings(db, username)
    settings.otp = False
    db.commit()
    db.refresh(settings)
    
    return PasswordChangeResponse(
        message=f"Password changed for {username} (password update in Radicale not implemented)",
        must_change_password=False
    )


@router.post("/", response_model=UserCreateResponse, summary="Create a new user (admin only)")
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Create a new user in Radicale's htpasswd file and database settings.
    
    Admin only. Creates user with OTP flag set to True, forcing password change on first login.
    If no password is provided, a random password will be generated.
    """
    username = user_data.username
    password = user_data.password or generate_random_password()
    
    # Check if user already exists in htpasswd
    if user_exists(username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User '{username}' already exists"
        )
    
    # Add user to htpasswd file
    try:
        add_user_to_htpasswd(username, password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Create user settings with OTP flag
    settings = UserService.get_or_create_user_settings(db, username)
    settings.otp = True
    db.commit()
    db.refresh(settings)
    
    return UserCreateResponse(
        username=username,
        password=password,
        otp=True,
        message=f"User '{username}' created successfully. Must change password on first login."
    )


@router.post("/{username}/reset-password", response_model=UserResetPasswordResponse, summary="Reset user password (admin only)")
async def reset_user_password(
    username: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Reset a user's password in Radicale's htpasswd file.
    
    Admin only. Generates a new random password and sets OTP flag to True,
    forcing the user to change their password on next login.
    """
    # Check if user exists
    if not user_exists(username):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{username}' does not exist"
        )
    
    # Generate new random password
    new_password = generate_random_password()
    
    # Update password in htpasswd file
    try:
        update_user_password(username, new_password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Set OTP flag in user settings
    settings = UserService.get_or_create_user_settings(db, username)
    settings.otp = True
    db.commit()
    db.refresh(settings)
    
    return UserResetPasswordResponse(
        username=username,
        new_password=new_password,
        otp=True,
        message=f"Password reset for '{username}'. User must change password on next login."
    )
