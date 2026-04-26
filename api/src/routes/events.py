from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Annotated
from datetime import datetime

from ..database import get_db
from ..models import User, Calendar
from ..schemas.events import EventCreate, EventUpdate, EventInDB, EventListResponse
from ..services.events import EventService
from ..services.calendars import CalendarService
from .dependencies import get_current_active_user

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/", response_model=EventInDB, status_code=status.HTTP_201_CREATED, summary="Create event")
async def create_event(
    event: EventCreate,
    calendar_id: int = Query(..., description="ID of the calendar to create event in"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new event in the specified calendar via CalDAV.
    User must have write access to the calendar.
    """
    # Verify calendar exists and user has access
    calendar = CalendarService.get_calendar(db, calendar_id)
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and current_user.id != calendar.owner_id:
        shares = CalendarService.get_shares_for_calendar(db, calendar_id)
        has_write = any(
            share.user_id == current_user.id and share.permission in ["write", "admin"]
            for share in shares
        )
        if not has_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No write permission for this calendar"
            )
    
    created_event = EventService.create_event(db, event, current_user.id, calendar_id)
    if not created_event:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create event in CalDAV"
        )
    return created_event


@router.get("/", response_model=List[EventInDB], summary="List events")
async def list_events(
    calendar_id: Optional[int] = Query(None, description="Filter by calendar ID"),
    start: Optional[datetime] = Query(None, description="Filter events from this date"),
    end: Optional[datetime] = Query(None, description="Filter events until this date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List events from user's calendars.
    User sees events from their own calendars and shared calendars.
    """
    print(f"DEBUG: calendar_id={calendar_id}, start={start}, end={end}, start_type={type(start)}, end_type={type(end)}")
    events = EventService.list_events(db, current_user.id, calendar_id, start, end)
    print(f"DEBUG: Found {len(events)} events")
    return events


@router.get("/{event_id}", response_model=EventInDB, summary="Get event by ID")
async def get_event(
    event_id: str,
    calendar_id: int = Query(..., description="ID of the calendar containing the event"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific event by its CalDAV URL.
    User must have read access to the calendar.
    """
    # Verify calendar exists and user has access
    calendar = CalendarService.get_calendar(db, calendar_id)
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and current_user.id != calendar.owner_id:
        shares = CalendarService.get_shares_for_calendar(db, calendar_id)
        has_read = any(share.user_id == current_user.id for share in shares)
        if not has_read:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No read permission for this calendar"
            )
    
    event = EventService.get_event(db, event_id, current_user.id, calendar_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    return event


@router.put("/{event_id}", response_model=EventInDB, summary="Update event")
async def update_event(
    event_id: str,
    event: EventUpdate,
    calendar_id: int = Query(..., description="ID of the calendar containing the event"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing event.
    User must have write access to the calendar.
    """
    # Verify calendar exists and user has access
    calendar = CalendarService.get_calendar(db, calendar_id)
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and current_user.id != calendar.owner_id:
        shares = CalendarService.get_shares_for_calendar(db, calendar_id)
        has_write = any(
            share.user_id == current_user.id and share.permission in ["write", "admin"]
            for share in shares
        )
        if not has_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No write permission for this calendar"
            )
    
    updated_event = EventService.update_event(db, event_id, event, current_user.id, calendar_id)
    if not updated_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found or failed to update"
        )
    return updated_event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete event")
async def delete_event(
    event_id: str,
    calendar_id: int = Query(..., description="ID of the calendar containing the event"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an event.
    User must have write access to the calendar.
    """
    # Verify calendar exists and user has access
    calendar = CalendarService.get_calendar(db, calendar_id)
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and current_user.id != calendar.owner_id:
        shares = CalendarService.get_shares_for_calendar(db, calendar_id)
        has_write = any(
            share.user_id == current_user.id and share.permission in ["write", "admin"]
            for share in shares
        )
        if not has_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No write permission for this calendar"
            )
    
    success = EventService.delete_event(db, event_id, current_user.id, calendar_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found or failed to delete"
        )
    return None
