"""
Event Service for managing events via CalDAV.
Integrates with CalDAV server (Radicale) for actual event storage.
"""
from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from .caldav_client import CalDAVClient
from ..models import Calendar
from ..schemas.events import EventCreate, EventUpdate, EventInDB
from ..services.users import UserService


class EventService:
    """
    Service for managing events through CalDAV.
    This service acts as a bridge between our database and the CalDAV server (Radicale).
    """
    
    @staticmethod
    def _get_caldav_client(db: Session, user_id: int) -> Optional[CalDAVClient]:
        """Get authenticated CalDAV client for user."""
        user = UserService.get_user(db, user_id)
        if not user:
            return None
        
        # For now, use username and a default password
        # In production, this should come from user settings
        client = CalDAVClient()
        # Try with the username and the same password (for Radicale htpasswd)
        # Note: This assumes Radicale uses the same credentials as our DB
        if client.connect(user.username, "admin"):  # Using admin for demo
            return client
        return None
    
    @staticmethod
    def _get_calendar_name(db: Session, calendar_id: int) -> Optional[str]:
        """Get calendar name from our database."""
        calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
        if calendar:
            return calendar.name
        return None
    
    @staticmethod
    def _resolve_calendar_path(db: Session, client: CalDAVClient, user_id: int, calendar_id: int) -> Tuple[Optional[str], Optional[str]]:
        """
        Resolve calendar path (username/name) and display name from either DB ID or virtual ID (hash).
        Returns (calendar_path, calendar_name).
        """
        import hashlib
        
        # 1. Try database first
        calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
        if calendar:
            user = UserService.get_user(db, calendar.owner_id)
            username = user.username if user else 'admin'
            return f"{username}/{calendar.name}", calendar.name
            
        # 2. Try Radicale for virtual ID
        user = UserService.get_user(db, user_id)
        if not user:
            return None, None
            
        # Get all calendars from Radicale and check hashes
        raw_calendars = client.get_calendars()
        for cal_info in raw_calendars:
            cal_url = cal_info.get('url')
            url_hash = int(hashlib.md5(cal_url.encode()).hexdigest()[:8], 16) % (2**31)
            
            if url_hash == calendar_id:
                cal_name = cal_info.get('name')
                cal_owner = cal_info.get('owner_username') or user.username
                return f"{cal_owner}/{cal_name}", cal_name
                
        return None, None

    @staticmethod
    def create_event(
        db: Session, 
        event: EventCreate, 
        user_id: int,
        calendar_id: int
    ) -> Optional[EventInDB]:
        """
        Create a new event in the specified calendar via CalDAV.
        """
        client = EventService._get_caldav_client(db, user_id)
        if not client:
            return None
        
        calendar_path, calendar_name = EventService._resolve_calendar_path(db, client, user_id, calendar_id)
        if not calendar_path:
            return None
        
        try:
            # First ensure calendar exists in CalDAV
            if not client.calendar_exists(calendar_path):
                client.create_calendar(calendar_path)
            
            event_url = client.create_event(
                calendar_name=calendar_path,
                summary=event.summary,
                start=event.start,
                end=event.end,
                description=event.description,
                location=event.location,
                all_day=event.all_day
            )
            
            if event_url:
                return EventInDB(
                    id=event_url,
                    summary=event.summary,
                    title=event.summary,
                    start=event.start,
                    end=event.end,
                    description=event.description,
                    location=event.location,
                    all_day=event.all_day,
                    calendar_id=calendar_id,
                    calendar_name=calendar_name,
                    created_at=datetime.utcnow()
                )
            return None
        except Exception as e:
            print(f"Error creating event in CalDAV: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def get_event(
        db: Session,
        event_id: str,
        user_id: int,
        calendar_id: int
    ) -> Optional[EventInDB]:
        """
        Get a specific event by its CalDAV URL.
        """
        client = EventService._get_caldav_client(db, user_id)
        if not client:
            return None
        
        calendar_path, calendar_name = EventService._resolve_calendar_path(db, client, user_id, calendar_id)
        if not calendar_path:
            return None
        
        try:
            event_data = client.get_event(calendar_path, event_id)
            if event_data:
                return EventInDB(
                    id=event_id,
                    summary=event_data.get('summary', 'Unnamed Event'),
                    title=event_data.get('summary', 'Unnamed Event'),
                    start=event_data.get('start'),
                    end=event_data.get('end'),
                    description=event_data.get('description'),
                    location=event_data.get('location'),
                    all_day=event_data.get('all_day', False),
                    recurring=False,
                    recurrence_rule=None,
                    color=None,
                    calendar_id=calendar_id,
                    calendar_name=calendar_name
                )
            return None
        except Exception as e:
            print(f"Error getting event: {e}")
            return None
    
    @staticmethod
    def list_events(
        db: Session,
        user_id: int,
        calendar_id: Optional[int] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None
    ) -> List[EventInDB]:
        """
        List events from user's calendars via CalDAV.
        If calendar_id is specified, only get events from that calendar.
        """
        import hashlib
        user = UserService.get_user(db, user_id)
        if not user:
            return []
        
        client = CalDAVClient()
        if not client.connect(user.username, "admin"):
            return []
        
        try:
            # Build a map of calendar_path to calendar_id for proper ID assignment
            calendar_id_map = {}
            calendar_name_map = {}
            calendar_paths = []
            
            if calendar_id:
                # Resolve the specific calendar
                calendar_path, calendar_name = EventService._resolve_calendar_path(db, client, user_id, calendar_id)
                if not calendar_path:
                    return []
                calendar_paths = [calendar_path]
                calendar_id_map[calendar_path] = calendar_id
                calendar_name_map[calendar_path] = calendar_name
            else:
                # All calendars - get from Radicale directly
                raw_calendars = client.get_calendars()
                for cal_info in raw_calendars:
                    cal_name = cal_info.get('name')
                    cal_url = cal_info.get('url')
                    cal_owner = cal_info.get('owner_username') or user.username
                    
                    cal_path = f"{cal_owner}/{cal_name}"
                    # Check if it's in DB for proper ID
                    db_cal = db.query(Calendar).filter(Calendar.name == cal_name).first()
                    if db_cal:
                        cal_id = db_cal.id
                    else:
                        # Generate virtual ID
                        cal_id = int(hashlib.md5(cal_url.encode()).hexdigest()[:8], 16) % (2**31)
                        
                    calendar_paths.append(cal_path)
                    calendar_id_map[cal_path] = cal_id
                    calendar_name_map[cal_path] = cal_name
            
            all_events = []
            for cal_path in calendar_paths:
                try:
                    events = client.get_events(cal_path, start, end)
                    cal_id = calendar_id_map.get(cal_path)
                    cal_name = calendar_name_map.get(cal_path)
                    for event_data in events:
                        event = EventInDB(
                            id=event_data.get('id'),
                            summary=event_data.get('summary', 'Unnamed Event'),
                            title=event_data.get('summary', 'Unnamed Event'),
                            start=event_data.get('start'),
                            end=event_data.get('end'),
                            description=event_data.get('description'),
                            location=event_data.get('location'),
                            all_day=event_data.get('all_day', False),
                            recurring=False,
                            recurrence_rule=None,
                            color=None,
                            calendar_id=cal_id,
                            calendar_name=cal_name
                        )
                        all_events.append(event)
                except Exception as e:
                    print(f"Error getting events from calendar '{cal_path}': {e}")
                    continue
            
            # Sort by start date
            all_events.sort(key=lambda x: x.start if x.start else datetime.min)
            return all_events
            
        except Exception as e:
            print(f"Error listing events: {e}")
            return []
    
    @staticmethod
    def update_event(
        db: Session,
        event_id: str,
        event: EventUpdate,
        user_id: int,
        calendar_id: int
    ) -> Optional[EventInDB]:
        """
        Update an existing event in CalDAV.
        """
        client = EventService._get_caldav_client(db, user_id)
        if not client:
            return None
        
        calendar_path, calendar_name = EventService._resolve_calendar_path(db, client, user_id, calendar_id)
        if not calendar_path:
            return None
        
        try:
            # Get old event to preserve any missing fields
            old_event_data = client.get_event(calendar_path, event_id)
            if not old_event_data:
                return None
            
            # Use provided data or fall back to old data
            summary = event.summary if event.summary else old_event_data.get('summary', 'Unnamed Event')
            start = event.start if event.start else old_event_data.get('start')
            end = event.end if event.end else old_event_data.get('end')
            description = event.description if event.description is not None else old_event_data.get('description')
            location = event.location if event.location is not None else old_event_data.get('location')
            all_day = event.all_day if event.all_day is not None else old_event_data.get('all_day', False)
            
            # We need just the calendar name for client.update_event
            # which extracts the name from calendar_path if it has /
            cal_name_only = calendar_path.split('/')[-1] if '/' in calendar_path else calendar_path

            success = client.update_event(
                calendar_name=cal_name_only,
                event_id=event_id,
                summary=summary,
                start=start,
                end=end,
                description=description,
                location=location,
                all_day=all_day
            )
            
            if success:
                return EventInDB(
                    id=event_id,
                    summary=summary,
                    title=summary,
                    start=start,
                    end=end,
                    description=description,
                    location=location,
                    all_day=all_day,
                    calendar_id=calendar_id,
                    calendar_name=calendar_name,
                    updated_at=datetime.utcnow()
                )
            return None
        except Exception as e:
            print(f"Error updating event: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def delete_event(
        db: Session,
        event_id: str,
        user_id: int,
        calendar_id: int
    ) -> bool:
        """
        Delete an event from CalDAV.
        """
        client = EventService._get_caldav_client(db, user_id)
        if not client:
            return False
        
        calendar_path, calendar_name = EventService._resolve_calendar_path(db, client, user_id, calendar_id)
        if not calendar_path:
            return False
        
        try:
            return client.delete_event(calendar_path, event_id)
        except Exception as e:
            print(f"Error deleting event: {e}")
            return False
