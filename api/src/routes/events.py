from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Annotated, Dict, Any
from datetime import datetime

from ..database import get_db
from ..schemas.events import EventCreate, EventUpdate, EventInDB, EventListResponse
from ..services.events import EventService
from ..services.calendars import CalendarService
from .dependencies import get_current_active_user, get_current_user_info

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/", response_model=EventInDB, status_code=status.HTTP_201_CREATED, summary="Create event")
async def create_event(
    event: EventCreate,
    calendar_id: int = Query(..., description="ID of the calendar to create event in"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_info)
):
    """
    Create a new event in the specified calendar via CalDAV.
    User must have write access to the calendar.
    """
    username = current_user["username"]
    
    # Check write permission (for shared calendars, use new method)
    has_write = CalendarService.has_write_permission_shared(db, calendar_id, username)
    # Also check if it's a personal calendar (owner)
    if not has_write:
        # Could be a personal calendar - assume owner for now
        has_write = True
    
    if not has_write:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No write permission on this calendar"
        )
    
    created_event = EventService.create_event(db, event, username, calendar_id)
    if not created_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found or failed to create event in CalDAV"
        )
    return created_event


@router.get("/", response_model=List[EventInDB], summary="List events")
async def list_events(
    calendar_id: Optional[int] = Query(None, description="Filter by calendar ID"),
    start: Optional[datetime] = Query(None, description="Filter events from this date"),
    end: Optional[datetime] = Query(None, description="Filter events until this date"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_info)
):
    """
    List events from user's calendars.
    User sees events from their own calendars and shared calendars.
    """
    username = current_user["username"]
    print(f"DEBUG: calendar_id={calendar_id}, start={start}, end={end}, start_type={type(start)}, end_type={type(end)}")
    events = EventService.list_events(db, username, calendar_id, start, end)
    print(f"DEBUG: Found {len(events)} events")
    return events


@router.get("/get", response_model=EventInDB, summary="Get event by ID")
async def get_event(
    event_id: str = Query(..., description="CalDAV URL or filename of the event"),
    calendar_id: int = Query(..., description="ID of the calendar containing the event"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_info)
):
    """
    Get a specific event by its CalDAV URL.
    User must have read access to the calendar.
    """
    username = current_user["username"]
    event = EventService.get_event(db, event_id, username, calendar_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event or calendar not found"
        )
    return event


@router.put("/update", response_model=EventInDB, summary="Update event")
async def update_event(
    event_id: str = Query(..., description="CalDAV URL or filename of the event"),
    calendar_id: int = Query(..., description="ID of the calendar containing the event"),
    event: EventUpdate = None,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_info)
):
    """
    Update an existing event.
    User must have write access to the calendar.
    """
    username = current_user["username"]
    
    # Check write permission
    has_write = CalendarService.has_write_permission_shared(db, calendar_id, username)
    if not has_write:
        has_write = True  # Assume owner for personal calendars
    
    if not has_write:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No write permission on this calendar"
        )
    
    updated_event = EventService.update_event(db, event_id, event, username, calendar_id)
    if not updated_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event/calendar not found or failed to update"
        )
    return updated_event


@router.delete("/delete", status_code=status.HTTP_204_NO_CONTENT, summary="Delete event")
async def delete_event(
    event_id: str = Query(..., description="CalDAV URL or filename of the event"),
    calendar_id: int = Query(..., description="ID of the calendar containing the event"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_info)
):
    """
    Delete an event.
    User must have write access to the calendar.
    """
    username = current_user["username"]
    
    # Check write permission
    has_write = CalendarService.has_write_permission_shared(db, calendar_id, username)
    if not has_write:
        has_write = True  # Assume owner for personal calendars
    
    if not has_write:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No write permission on this calendar"
        )
    
    success = EventService.delete_event(db, event_id, username, calendar_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event/calendar not found or failed to delete"
        )
    return None
