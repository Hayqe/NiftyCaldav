"""
Event Service for managing events via CalDAV.
Integrates with CalDAV server (Radicale) for actual event storage.
"""
from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from .caldav_client import CalDAVClient
from .auth import AuthService
from ..schemas.events import EventCreate, EventUpdate, EventInDB


class EventService:
    """
    Service for managing events through CalDAV.
    This service acts as a bridge between our database and the CalDAV server (Radicale).
    
    Note: With the new architecture, users are authenticated via Radicale directly,
    and we use username (string) instead of user_id (int).
    """
    
    @staticmethod
    def _get_caldav_client(username: str) -> Optional[CalDAVClient]:
        """Get authenticated CalDAV client for username."""
        from .auth import AuthService
        
        # Get password from cache (stored at login time)
        password = AuthService.get_password_for_user(username)
        
        if not password:
            password = "admin"  # Fallback for demo
        
        client = CalDAVClient()
        if client.connect(username, password):
            return client
        return None
    
    @staticmethod
    def _get_calendar_name_from_id(
        db: Session, 
        client: CalDAVClient, 
        username: str, 
        calendar_id: int
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Resolve calendar path (username/name) and display name from virtual ID (hash).
        Returns (calendar_path, calendar_name).
        """
        import hashlib
        from ..models import SharedCalendar
        
        # First check if this is a shared calendar
        shared_calendar = db.query(SharedCalendar).filter(SharedCalendar.id == calendar_id).first()
        if shared_calendar:
            # For shared calendars, we need to connect with the generated credentials
            if client.connect(shared_calendar.radicale_username, shared_calendar.password):
                raw_calendars = client.get_calendars()
                for cal_info in raw_calendars:
                    cal_name = cal_info.get('name')
                    # For shared calendars, the calendar name in Radicale matches our shared calendar name
                    if cal_name == shared_calendar.name:
                        return f"{shared_calendar.radicale_username}/{cal_name}", cal_name
            return None, None
        
        # For personal calendars, use virtual IDs (hash from URL)
        # Get all calendars from Radicale and check hashes
        password = AuthService.get_password_for_user(username)
        if not password:
            password = "admin"
        if not client.connect(username, password):
            return None, None
            
        raw_calendars = client.get_calendars()
        for cal_info in raw_calendars:
            cal_url = cal_info.get('url')
            url_hash = int(hashlib.md5(cal_url.encode()).hexdigest()[:8], 16) % (2**31)
            
            if url_hash == calendar_id:
                cal_name = cal_info.get('name')
                cal_owner = cal_info.get('owner_username') or username
                return f"{cal_owner}/{cal_name}", cal_name
                
        return None, None
    
    @staticmethod
    def _get_caldav_client_for_calendar(db: Session, username: str, calendar_id: int) -> Tuple[Optional[CalDAVClient], Optional[str], Optional[str]]:
        """
        Get a CalDAV client connected to the appropriate calendar.
        For shared calendars, connects with the shared calendar's credentials.
        For personal calendars, connects with the user's credentials.
        Returns (client, calendar_path, calendar_name).
        """
        from ..models import SharedCalendar
        
        # Check if this is a shared calendar
        shared_calendar = db.query(SharedCalendar).filter(SharedCalendar.id == calendar_id).first()
        if shared_calendar:
            client = CalDAVClient()
            if client.connect(shared_calendar.radicale_username, shared_calendar.password):
                raw_calendars = client.get_calendars()
                for cal_info in raw_calendars:
                    cal_name = cal_info.get('name')
                    if cal_name == shared_calendar.name:
                        calendar_path = f"{shared_calendar.radicale_username}/{cal_name}"
                        return client, calendar_path, cal_name
            return None, None, None
        
        # For personal calendars
        client = EventService._get_caldav_client(username)
        if not client:
            return None, None, None
        
        calendar_path, calendar_name = EventService._get_calendar_name_from_id(db, client, username, calendar_id)
        if not calendar_path:
            return None, None, None
        
        return client, calendar_path, calendar_name

    @staticmethod
    def create_event(
        db: Session, 
        event: EventCreate, 
        username: str,
        calendar_id: int
    ) -> Optional[EventInDB]:
        """
        Create a new event in the specified calendar via CalDAV.
        """
        client, calendar_path, calendar_name = EventService._get_caldav_client_for_calendar(db, username, calendar_id)
        if not client or not calendar_path:
            return None
        
        try:
            # First ensure calendar exists in CalDAV
            if not client.calendar_exists(calendar_path):
                # Extract just the name part for creation
                cal_name_only = calendar_path.split('/')[-1] if '/' in calendar_path else calendar_path
                client.create_calendar(cal_name_only)
            
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
        username: str,
        calendar_id: int
    ) -> Optional[EventInDB]:
        """
        Get a specific event by its CalDAV URL.
        """
        client, calendar_path, calendar_name = EventService._get_caldav_client_for_calendar(db, username, calendar_id)
        if not client or not calendar_path:
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
        username: str,
        calendar_id: Optional[int] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None
    ) -> List[EventInDB]:
        """
        List events from user's calendars via CalDAV.
        If calendar_id is specified, only get events from that calendar.
        """
        import hashlib
        from ..models import SharedCalendar
        
        try:
            # Build a map of calendar_path to calendar_id for proper ID assignment
            calendar_id_map = {}
            calendar_name_map = {}
            calendar_paths = []
            
            if calendar_id:
                # Check if this is a shared calendar
                shared_calendar = db.query(SharedCalendar).filter(SharedCalendar.id == calendar_id).first()
                if shared_calendar:
                    # For shared calendar, connect with its credentials
                    client = CalDAVClient()
                    if client.connect(shared_calendar.radicale_username, shared_calendar.password):
                        calendar_path = f"{shared_calendar.radicale_username}/{shared_calendar.name}"
                        calendar_paths = [calendar_path]
                        calendar_id_map[calendar_path] = calendar_id
                        calendar_name_map[calendar_path] = shared_calendar.name
                else:
                    # For personal calendar
                    client = EventService._get_caldav_client(username)
                    if not client:
                        return []
                    calendar_path, calendar_name = EventService._get_calendar_name_from_id(db, client, username, calendar_id)
                    if not calendar_path:
                        return []
                    calendar_paths = [calendar_path]
                    calendar_id_map[calendar_path] = calendar_id
                    calendar_name_map[calendar_path] = calendar_name
            else:
                # All calendars - get from Radicale directly for personal calendars
                client = EventService._get_caldav_client(username)
                if not client:
                    return []
                
                raw_calendars = client.get_calendars()
                for cal_info in raw_calendars:
                    cal_name = cal_info.get('name')
                    cal_url = cal_info.get('url')
                    cal_owner = cal_info.get('owner_username') or username
                    
                    cal_path = f"{cal_owner}/{cal_name}"
                    
                    # Generate virtual ID from URL
                    url_hash = int(hashlib.md5(cal_url.encode()).hexdigest()[:8], 16) % (2**31)
                    
                    calendar_paths.append(cal_path)
                    calendar_id_map[cal_path] = url_hash
                    calendar_name_map[cal_path] = cal_name
                
                # Also add shared calendars with read access
                from ..services.calendars import CalendarService
                shared_calendars = CalendarService.get_shared_calendars_for_user(db, username)
                for shared_cal in shared_calendars:
                    if shared_cal.get('permission') in ['RW', 'RO']:
                        client_shared = CalDAVClient()
                        if client_shared.connect(shared_cal.get('radicale_username'), shared_cal.get('password')):
                            cal_path = f"{shared_cal.get('radicale_username')}/{shared_cal.get('name')}"
                            calendar_paths.append(cal_path)
                            calendar_id_map[cal_path] = shared_cal.get('id')
                            calendar_name_map[cal_path] = shared_cal.get('name')
            
            all_events = []
            
            # For each calendar path, we need to use the appropriate client
            for cal_path in calendar_paths:
                # Determine which client to use based on the path
                cal_id = calendar_id_map.get(cal_path)
                
                # Check if this is a shared calendar
                if cal_id:
                    shared_calendar = db.query(SharedCalendar).filter(SharedCalendar.id == cal_id).first()
                    if shared_calendar:
                        client_for_cal = CalDAVClient()
                        if not client_for_cal.connect(shared_calendar.radicale_username, shared_calendar.password):
                            continue
                    else:
                        # Personal calendar - use original client
                        client_for_cal = EventService._get_caldav_client(username)
                        if not client_for_cal:
                            continue
                else:
                    client_for_cal = EventService._get_caldav_client(username)
                    if not client_for_cal:
                        continue
                
                try:
                    events = client_for_cal.get_events(cal_path, start, end)
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
        username: str,
        calendar_id: int
    ) -> Optional[EventInDB]:
        """
        Update an existing event in CalDAV.
        """
        client, calendar_path, calendar_name = EventService._get_caldav_client_for_calendar(db, username, calendar_id)
        if not client or not calendar_path:
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
        username: str,
        calendar_id: int
    ) -> bool:
        """
        Delete an event from CalDAV.
        """
        client, calendar_path, calendar_name = EventService._get_caldav_client_for_calendar(db, username, calendar_id)
        if not client or not calendar_path:
            return False
        
        try:
            return client.delete_event(calendar_path, event_id)
        except Exception as e:
            print(f"Error deleting event: {e}")
            return False
