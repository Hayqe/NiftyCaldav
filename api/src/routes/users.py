from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Annotated

from ..database import get_db
from ..models import User
from ..schemas.users import UserCreate, UserUpdate, UserInDB, UserSettingsInDB, UserSettingsUpdate
from ..services.users import UserService
from ..services.auth import AuthService
from .dependencies import get_current_user, get_current_active_user, get_admin_user

router = APIRouter(prefix="/users", tags=["users"])


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
