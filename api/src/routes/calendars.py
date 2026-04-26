from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Annotated, Optional

from ..database import get_db
from ..models import User, Calendar, CalendarShare
from ..schemas.calendars import (
    CalendarCreate, CalendarUpdate, CalendarInDB, CalendarRadicale, 
    CalendarShareCreate, CalendarShareInDB, CalendarWithShares, CalendarRadicaleWithShares
)
from ..services.calendars import CalendarService
from ..services.caldav_client import CalDAVClient
from .dependencies import get_current_active_user, get_admin_user, get_current_user_from_token

router = APIRouter(prefix="/calendars", tags=["calendars"])


@router.post("/", response_model=CalendarRadicale, summary="Create a new calendar in Radicale")
async def create_calendar(
    calendar: CalendarCreate,
    token_payload: dict = Depends(get_current_user_from_token)
):
    """
    Create a new calendar directly in Radicale (no database).
    Returns calendar info from Radicale.
    """
    username = token_payload.get("username", "admin")
    try:
        result = CalendarService.create_calendar_radicale(calendar, username)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=List[CalendarRadicaleWithShares], summary="List all calendars from Radicale")
async def read_calendars(
    token_payload: dict = Depends(get_current_user_from_token)
):
    """
    List all calendars for the current user directly from Radicale.
    Admin users see all calendars on the server.
    """
    username = token_payload.get("username", "admin")
    client = CalDAVClient()
    if not client.connect(username, "admin"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to connect to CalDAV"
        )
    
    # Get all calendars for this user from Radicale
    raw_calendars = client.get_calendars()
    
    result = []
    for cal_info in raw_calendars:
        cal_name = cal_info.get('name')
        cal_url = cal_info.get('url')
        cal_desc = cal_info.get('description')
        cal_color = cal_info.get('color', 'blue')
        cal_owner = cal_info.get('owner_username')
        
        result.append(CalendarRadicaleWithShares(
            name=cal_name,
            url=cal_url,
            description=cal_desc,
            color=cal_color,
            owner_username=cal_owner,
            shares=[]  # Shares will be added in a separate step
        ))
    
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
