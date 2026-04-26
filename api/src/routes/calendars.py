from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Annotated

from ..database import get_db
from ..models import User, Calendar, CalendarShare
from ..schemas.calendars import (
    CalendarCreate, CalendarUpdate, CalendarInDB, 
    CalendarShareCreate, CalendarShareInDB, CalendarWithShares
)
from ..services.calendars import CalendarService
from .dependencies import get_current_active_user, get_admin_user

router = APIRouter(prefix="/calendars", tags=["calendars"])


@router.post("/", response_model=CalendarInDB, summary="Create a new calendar")
async def create_calendar(
    calendar: CalendarCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new calendar. User creates their own calendar.
    """
    return CalendarService.create_calendar(db, calendar, current_user.id)


@router.get("/", response_model=List[CalendarWithShares], summary="List all calendars")
async def read_calendars(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List calendars. Regular users see their own + shared calendars. Admins see all.
    """
    if current_user.role == "admin":
        calendars = CalendarService.get_all_calendars(db, skip, limit)
    else:
        # Get user's own calendars
        own_calendars = CalendarService.get_calendars_by_owner(db, current_user.id, skip, limit)
        
        # Get shared calendars
        shared_calendars = CalendarService.get_shared_calendars_for_user(db, current_user.id)
        
        # Combine and deduplicate
        calendar_ids = {c.id for c in own_calendars}
        calendars = own_calendars
        for c in shared_calendars:
            if c.id not in calendar_ids:
                calendars.append(c)
    
    # Add shares to each calendar
    result = []
    for calendar in calendars:
        shares = CalendarService.get_shares_for_calendar(db, calendar.id)
        result.append(CalendarWithShares.model_validate({
            "id": calendar.id,
            "name": calendar.name,
            "description": calendar.description,
            "color": calendar.color,
            "owner_id": calendar.owner_id,
            "created_at": calendar.created_at,
            "updated_at": calendar.updated_at,
            "shares": shares
        }))
    
    return result


@router.get("/{calendar_id}", response_model=CalendarWithShares, summary="Get calendar by ID")
async def read_calendar(
    calendar_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get calendar by ID. User must own the calendar or it must be shared with them.
    Admin can access any calendar.
    """
    calendar = CalendarService.get_calendar(db, calendar_id)
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and current_user.id != calendar.owner_id:
        # Check if shared
        shares = CalendarService.get_shares_for_calendar(db, calendar_id)
        has_access = any(share.user_id == current_user.id for share in shares)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this calendar"
            )
    
    shares = CalendarService.get_shares_for_calendar(db, calendar_id)
    return CalendarWithShares.model_validate({
        "id": calendar.id,
        "name": calendar.name,
        "description": calendar.description,
        "color": calendar.color,
        "owner_id": calendar.owner_id,
        "created_at": calendar.created_at,
        "updated_at": calendar.updated_at,
        "shares": shares
    })


@router.put("/{calendar_id}", response_model=CalendarInDB, summary="Update calendar")
async def update_calendar(
    calendar_id: int,
    calendar: CalendarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update calendar. User must be owner or admin.
    """
    updated_calendar = CalendarService.update_calendar(db, calendar_id, calendar, current_user.id)
    if not updated_calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found or no permission"
        )
    return updated_calendar


@router.delete("/{calendar_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete calendar")
async def delete_calendar(
    calendar_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete calendar. User must be owner or admin.
    """
    success = CalendarService.delete_calendar(db, calendar_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found or no permission"
        )
    return None


# Calendar Shares
@router.post("/{calendar_id}/shares", response_model=CalendarShareInDB, summary="Share calendar with user")
async def create_share(
    calendar_id: int,
    share: CalendarShareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Share calendar with another user. User must be owner or admin.
    """
    db_share = CalendarService.create_share(db, calendar_id, share, current_user.id)
    if not db_share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found or no permission"
        )
    return db_share


@router.get("/{calendar_id}/shares", response_model=List[CalendarShareInDB], summary="Get calendar shares")
async def read_shares(
    calendar_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all shares for a calendar. User must be owner or admin.
    """
    calendar = CalendarService.get_calendar(db, calendar_id)
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )
    
    if current_user.role != "admin" and current_user.id != calendar.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view shares"
        )
    
    return CalendarService.get_shares_for_calendar(db, calendar_id)


@router.put("/{calendar_id}/shares/{user_id}", response_model=CalendarShareInDB, summary="Update calendar share")
async def update_share(
    calendar_id: int,
    user_id: int,
    permission: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update share permission. User must be owner or admin.
    """
    db_share = CalendarService.update_share(db, calendar_id, user_id, permission, current_user.id)
    if not db_share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found or no permission"
        )
    return db_share


@router.delete("/{calendar_id}/shares/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove calendar share")
async def delete_share(
    calendar_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove share. User must be owner or admin.
    """
    success = CalendarService.delete_share(db, calendar_id, user_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found or no permission"
        )
    return None
