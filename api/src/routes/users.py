from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Annotated, Optional

from ..database import get_db
from ..models import User
from ..schemas.users import (
    UserCreate, UserUpdate, UserInDB, UserSettingsInDB, UserSettingsUpdate,
    UserCreateResponse, PasswordChange, PasswordChangeResponse
)
from ..services.users import UserService
from ..services.auth import AuthService
from .dependencies import get_current_user, get_current_active_user, get_admin_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/all-simple", response_model=List[UserInDB], summary="List all users simple")
async def read_all_users_simple(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all users for sharing purposes. All authenticated users can access this.
    """
    return UserService.get_users(db, 0, 1000)


@router.get("/", response_model=List[UserInDB], summary="List all users")
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all users. Only accessible to admins or for sharing purposes.
    """
    if current_user.role != "admin":
        # Non-admin users can only see themselves for sharing
        return [current_user]
    
    return UserService.get_users(db, skip, limit)


@router.post("/", response_model=UserInDB, summary="Create a new user")
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Create a new user. Admin only.
    """
    existing_user = UserService.get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    return UserService.create_user(db, user)


@router.get("/", response_model=List[UserInDB], summary="List all users")
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    List all users. Admin only.
    """
    return UserService.get_users(db, skip, limit)


@router.get("/me", response_model=UserInDB, summary="Get current user info")
async def read_current_user(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get information about the current logged in user.
    """
    return current_user


@router.get("/{user_id}", response_model=UserInDB, summary="Get user by ID")
async def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get user by ID. User can get own info, admin can get any user.
    """
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user"
        )
    
    user = UserService.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/{user_id}", response_model=UserInDB, summary="Update user")
async def update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update user. User can update own info, admin can update any user.
    """
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
    
    updated_user = UserService.update_user(db, user_id, user)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return updated_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete user")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Delete user. Admin only.
    """
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    success = UserService.delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return None


@router.get("/{user_id}/settings", response_model=UserSettingsInDB, summary="Get user settings")
async def read_user_settings(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get user settings. User can get own settings, admin can get any user's settings.
    """
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access these settings"
        )
    
    settings = UserService.get_or_create_user_settings(db, user_id)
    return settings


@router.put("/{user_id}/settings", response_model=UserSettingsInDB, summary="Update user settings")
async def update_user_settings(
    user_id: int,
    settings: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update user settings. User can update own settings, admin can update any user's settings.
    """
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update these settings"
        )
    
    updated_settings = UserService.update_user_settings(db, user_id, settings.model_dump(exclude_unset=True))
    if not updated_settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User settings not found"
        )
    return updated_settings


# Admin-only endpoints for user management with one-time passwords

@router.post("/create-with-otp", response_model=UserCreateResponse, summary="Create user with one-time password")
async def create_user_with_otp(
    username: str,
    role: Optional[str] = "user",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Create a new user with a one-time password (three Dutch words).
    The user will be forced to change their password on first login.
    Admin only.
    """
    existing_user = UserService.get_user_by_username(db, username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    db_user, one_time_password = UserService.create_user_with_otp(db, username, role)
    
    # Return user info with the one-time password
    return UserCreateResponse(
        id=db_user.id,
        username=db_user.username,
        role=db_user.role,
        must_change_password=db_user.must_change_password,
        created_at=db_user.created_at,
        updated_at=db_user.updated_at,
        one_time_password=one_time_password
    )


@router.post("/{user_id}/reset-password", response_model=UserCreateResponse, summary="Reset user password")
async def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Reset a user's password to a new one-time password.
    The user will be forced to change their password on next login.
    Admin only.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    db_user, one_time_password = UserService.reset_user_password(db, user_id)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"Password reset for user {user_id}: OTP = {one_time_password}")
    
    return UserCreateResponse(
        id=db_user.id,
        username=db_user.username,
        role=db_user.role,
        must_change_password=db_user.must_change_password,
        created_at=db_user.created_at,
        updated_at=db_user.updated_at,
        one_time_password=one_time_password
    )


@router.post("/me/change-password", response_model=PasswordChangeResponse, summary="Change own password")
async def change_own_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Change the current user's password.
    If must_change_password is True, current_password is not required.
    """
    # If user must change password, they don't need to provide current password
    verify_current = password_data.current_password if not current_user.must_change_password else None
    
    updated_user = UserService.change_password(
        db, 
        current_user.id, 
        password_data.new_password, 
        verify_current
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid current password"
        )
    
    return PasswordChangeResponse(
        message="Password changed successfully",
        must_change_password=updated_user.must_change_password
    )


@router.post("/{user_id}/change-password", response_model=PasswordChangeResponse, summary="Change another user's password (admin)")
async def change_user_password(
    user_id: int,
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Change another user's password.
    Admin only. Current password verification is not required for admins.
    """
    updated_user = UserService.change_password(
        db,
        user_id,
        password_data.new_password,
        None  # Admins don't need to verify current password
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return PasswordChangeResponse(
        message="Password changed successfully",
        must_change_password=updated_user.must_change_password
    )
