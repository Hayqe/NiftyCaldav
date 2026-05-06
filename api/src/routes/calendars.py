from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Annotated, Optional

from ..database import get_db
from ..models import User, Calendar, CalendarShare
from ..schemas.calendars import (
    CalendarCreate, CalendarUpdate, CalendarInDB, CalendarRadicale, 
    CalendarShareCreate, CalendarShareInDB, CalendarWithShares, CalendarRadicaleWithShares,
    CalendarWithSharingInfo
)
from ..schemas.users import UserCreate
from ..services.calendars import CalendarService
from ..services.caldav_client import CalDAVClient
from ..services.users import UserService
from .dependencies import get_current_active_user, get_admin_user

router = APIRouter(prefix="/calendars", tags=["calendars"])


# ==================== Root Endpoints ====================

@router.post("/", response_model=CalendarRadicale, summary="Create a new calendar in Radicale")
async def create_calendar(
    calendar: CalendarCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new calendar directly in Radicale (no database).
    Returns calendar info from Radicale.
    """
    import hashlib
    username = current_user.username
    try:
        result = CalendarService.create_calendar_radicale(calendar, username)
        
        # Add virtual ID from URL hash
        url = result.get("url")
        url_hash = int(hashlib.md5(url.encode()).hexdigest()[:8], 16) % (2**31)
        result["id"] = url_hash
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=List[CalendarRadicaleWithShares], summary="List all calendars from Radicale")
async def read_calendars(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all calendars for the current user directly from Radicale.
    This only includes personal (non-shared) calendars.
    Shared calendars are available via /calendars/shared.
    """
    username = current_user.username
    client = CalDAVClient()
    if not client.connect(username, "admin"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to connect to CalDAV"
        )
    
    # Get all calendars for this user from Radicale
    raw_calendars = client.get_calendars()
    
    # Generate virtual IDs from calendar URLs for frontend compatibility
    import hashlib
    from datetime import datetime
    
    result = []
    for cal_info in raw_calendars:
        cal_name = cal_info.get('name')
        cal_url = cal_info.get('url')
        cal_desc = cal_info.get('description')
        cal_color = cal_info.get('color', 'blue')
        cal_owner = cal_info.get('owner_username')
        
        # Generate a deterministic ID from the URL
        url_hash = int(hashlib.md5(cal_url.encode()).hexdigest()[:8], 16) % (2**31)
        
        result.append(CalendarRadicaleWithShares(
            id=url_hash,
            name=cal_name,
            url=cal_url,
            description=cal_desc,
            color=cal_color,
            owner_id=1,  # Default for now
            owner_username=cal_owner,
            created_at=None,
            updated_at=None,
            shares=[]
        ))
    
    return result


# ==================== Shared Calendar Endpoints (Static Paths) ====================

# Shared Calendar Creation
@router.post("/create-shared", summary="Create a new shared calendar with auto-generated user")
async def create_shared_calendar(
    calendar: CalendarCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new calendar with a system-generated username/password.
    The calendar is owned by the current user and can be shared with others.
    Returns the calendar info with generated credentials.
    """
    import secrets
    import string
    from typing import Dict, Any
    
    # Generate random username and password for the new user
    def generate_random_string(length: int = 12) -> str:
        chars = string.ascii_lowercase + string.digits
        return ''.join(secrets.choice(chars) for _ in range(length))
    
    username = f"shared_{generate_random_string(8)}"
    password = generate_random_string(16)
    
    # Create user in database
    user_data = UserCreate(username=username, password=password, role="user")
    new_user = UserService.create_user(db, user_data)
    
    # Create calendar in Radicale with the new user
    result = CalendarService.create_calendar_radicale(calendar, username)
    
    # Store calendar in database with system credentials
    db_calendar = Calendar(
        name=calendar.name,
        description=calendar.description,
        color=calendar.color or "blue",
        owner_id=current_user.id,
        system_username=username,
        system_password=password,
        is_shared_calendar=True
    )
    db.add(db_calendar)
    db.commit()
    db.refresh(db_calendar)
    
    # Return calendar with generated credentials (not using Pydantic model to include extra fields)
    return {
        "id": db_calendar.id,
        "name": db_calendar.name,
        "description": db_calendar.description,
        "color": db_calendar.color,
        "owner_id": db_calendar.owner_id,
        "created_at": db_calendar.created_at.isoformat() if db_calendar.created_at else None,
        "updated_at": db_calendar.updated_at.isoformat() if db_calendar.updated_at else None,
        "generated_username": username,
        "generated_password": password,
        "radicale_url": result.get("url")
    }


# Get shared calendars for current user
@router.get("/shared", response_model=List[CalendarWithSharingInfo], summary="Get all shared calendars (owned + shared with me)")
async def read_shared_calendars(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all shared calendars for the current user:
    - Calendars owned by the user that are marked as shared
    - Calendars shared with the user by others
    """
    return CalendarService.get_all_shared_calendars_for_user(db, current_user.id)


# Get all calendars (own + shared) with credentials
@router.get("/my-and-shared", summary="Get all calendars user has access to with credentials")
async def read_my_and_shared_calendars(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all calendars the user owns or has been shared with, including credentials for accessing shared calendars.
    Returns calendar info with generated_username and generated_password for shared calendars.
    """
    calendars = CalendarService.get_my_and_shared_calendars(db, current_user.id)
    return calendars


# ==================== Single Calendar Endpoints (Dynamic Paths) ====================

@router.get("/{calendar_id}", response_model=CalendarRadicaleWithShares, summary="Get calendar by ID (Radicale)")
async def read_calendar(
    calendar_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get calendar by ID (hash from URL) directly from Radicale.
    """
    username = current_user.username
    client = CalDAVClient()
    if not client.connect(username, "admin"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to connect to CalDAV"
        )
    
    # Get all calendars and find one with matching ID (hash)
    import hashlib
    raw_calendars = client.get_calendars()
    
    for cal_info in raw_calendars:
        cal_url = cal_info.get('url')
        url_hash = int(hashlib.md5(cal_url.encode()).hexdigest()[:8], 16) % (2**31)
        if url_hash == calendar_id:
            cal_name = cal_info.get('name')
            cal_desc = cal_info.get('description')
            cal_color = cal_info.get('color', 'blue')
            
            return CalendarRadicaleWithShares(
                id=calendar_id,
                name=cal_name,
                url=cal_url,
                description=cal_desc,
                color=cal_color,
                owner_id=1,
                owner_username=username,
                created_at=None,
                updated_at=None,
                shares=[]
            )
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Calendar not found"
    )


@router.put("/{calendar_id}", response_model=CalendarRadicale, summary="Update calendar (Radicale)")
async def update_calendar(
    calendar_id: int,
    calendar: CalendarUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update calendar directly in Radicale.
    Currently limited to description updates.
    """
    username = current_user.username
    client = CalDAVClient()
    if not client.connect(username, "admin"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to connect to CalDAV"
        )
    
    # Find calendar by ID (hash)
    import hashlib
    raw_calendars = client.get_calendars()
    
    for cal_info in raw_calendars:
        cal_url = cal_info.get('url')
        url_hash = int(hashlib.md5(cal_url.encode()).hexdigest()[:8], 16) % (2**31)
        if url_hash == calendar_id:
            # Update via CalDAV PROPPATCH (not fully implemented in caldav library)
            # For now, just return the calendar info
            cal_name = cal_info.get('name')
            
            # Note: Full calendar update via CalDAV is complex
            # This is a placeholder for now
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Calendar update via Radicale not yet implemented"
            )
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Calendar not found"
    )


@router.delete("/{calendar_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete calendar (Radicale)")
async def delete_calendar(
    calendar_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete calendar directly from Radicale.
    """
    username = current_user.username
    client = CalDAVClient()
    if not client.connect(username, "admin"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to connect to CalDAV"
        )
    
    # Find calendar by ID (hash) and delete
    import hashlib
    
    raw_calendars = client.get_calendars()
    
    for cal_info in raw_calendars:
        cal_url = cal_info.get('url')
        cal_name = cal_info.get('name')
        url_hash = int(hashlib.md5(cal_url.encode()).hexdigest()[:8], 16) % (2**31)
        if url_hash == calendar_id:
            # Use the caldav client delete method
            # Extract just the calendar name (last part of URL)
            if '/' in cal_url:
                parts = cal_url.rstrip('/').split('/')
                cal_name_only = parts[-1] if parts else cal_name
            else:
                cal_name_only = cal_name
            
            if client.delete_calendar(cal_name_only):
                return None
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to delete calendar from Radicale"
                )
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Calendar not found"
    )


# ==================== Calendar Permission Endpoints ====================

# Check write permission for a calendar
@router.get("/{calendar_id}/check-write-permission", summary="Check if user has write permission on calendar")
async def check_write_permission(
    calendar_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Check if the current user has write permission on the specified calendar.
    Returns True if user can write to the calendar.
    """
    has_permission = CalendarService.has_write_permission(db, calendar_id, current_user.id)
    return {"has_write_permission": has_permission}


# Check read permission for a calendar
@router.get("/{calendar_id}/check-read-permission", summary="Check if user has read permission on calendar")
async def check_read_permission(
    calendar_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Check if the current user has at least read permission on the specified calendar.
    Returns True if user can read from the calendar.
    """
    has_permission = CalendarService.has_read_permission(db, calendar_id, current_user.id)
    return {"has_read_permission": has_permission}


# ==================== Calendar Share Endpoints ====================

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
