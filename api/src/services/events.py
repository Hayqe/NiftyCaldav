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
        
        calendar_name = EventService._get_calendar_name(db, calendar_id)
        if not calendar_name:
            return None
        
        # Get username from client for Radicale calendar path
        username = client.client.username if hasattr(client.client, 'username') else 'admin'
        # For Radicale, calendar path is username/calendar_name
        calendar_path = f"{username}/{calendar_name}"
        
        # Also try with just "admin" password for demo
        # First try with our method
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
                location=event.location
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
        
        # Get username for Radicale calendar path
        user = UserService.get_user(db, user_id)
        username = user.username if user else 'admin'
        
        calendar_name = EventService._get_calendar_name(db, calendar_id)
        if not calendar_name:
            return None
        
        # For Radicale, calendar path is username/calendar_name
        calendar_path = f"{username}/{calendar_name}"
        
        # Ensure calendar exists in CalDAV
        if not client.calendar_exists(calendar_path):
            client.create_calendar(calendar_path)
        
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
                    all_day=False,
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
        user = UserService.get_user(db, user_id)
        print(f"DEBUG EventService.list_events: user_id={user_id}, user={user.username if user else None}, calendar_id={calendar_id}")
        if not user:
            print(f"DEBUG: User not found for user_id={user_id}")
            return []
        
        client = CalDAVClient()
        # Connect to CalDAV server with user's credentials
        # Note: Radicale uses htpasswd with username/password from environment
        # For demo, we use admin/admin for all users
        if not client.connect(user.username, "admin"):
            print(f"DEBUG: Failed to connect to CalDAV for user {user.username}")
            return []
        
        print(f"DEBUG: Connected to CalDAV as {user.username}")
        
        try:
            # Build a map of calendar_path to calendar_id for proper ID assignment
            calendar_id_map = {}
            calendar_names = []
            
            if calendar_id:
                # Single calendar case
                calendar_name = EventService._get_calendar_name(db, calendar_id)
                print(f"DEBUG: calendar_id={calendar_id}, calendar_name={calendar_name}")
                if not calendar_name:
                    print(f"DEBUG: Calendar not found for calendar_id={calendar_id}")
                    return []
                # For Radicale, calendar path is username/calendar_name
                calendar_path = f"{user.username}/{calendar_name}"
                print(f"DEBUG: Using calendar_path={calendar_path}")
                calendar_names = [calendar_path]
                calendar_id_map[calendar_path] = calendar_id
                
                # Ensure calendar exists in CalDAV (pass just the calendar name, not the full path)
                if not client.calendar_exists(calendar_name):
                    print(f"DEBUG: Creating calendar {calendar_name} in CalDAV")
                    client.create_calendar(calendar_name)
            else:
                # All calendars case - get own and shared
                from ..models import Calendar, CalendarShare
                own_calendars = db.query(Calendar).filter(Calendar.owner_id == user_id).all()
                for c in own_calendars:
                    calendar_path = f"{user.username}/{c.name}"
                    calendar_names.append(calendar_path)
                    calendar_id_map[calendar_path] = c.id
                    # Ensure calendar exists in CalDAV
                    if not client.calendar_exists(calendar_path):
                        print(f"DEBUG: Creating calendar {calendar_path} in CalDAV")
                        client.create_calendar(calendar_path)
                
                # Shared calendars
                shares = db.query(CalendarShare).filter(CalendarShare.user_id == user_id).all()
                for share in shares:
                    cal_path = f"{share.calendar.owner.username}/{share.calendar.name}"
                    if cal_path not in calendar_id_map:
                        calendar_names.append(cal_path)
                        calendar_id_map[cal_path] = share.calendar.id
                        # Ensure calendar exists in CalDAV
                        if not client.calendar_exists(cal_path):
                            print(f"DEBUG: Creating calendar {cal_path} in CalDAV")
                            client.create_calendar(cal_path)
            
            if not calendar_names:
                print(f"DEBUG: No calendar names found")
                return []
            
            all_events = []
            for cal_name in calendar_names:
                try:
                    events = client.get_events(cal_name, start, end)
                    cal_id = calendar_id_map.get(cal_name)
                    print(f"DEBUG: Processing {len(events)} events from calendar {cal_name}, calendar_id={cal_id}")
                    for event_data in events:
                        event = EventInDB(
                            id=event_data.get('id'),
                            summary=event_data.get('summary', 'Unnamed Event'),
                            title=event_data.get('summary', 'Unnamed Event'),  # Frontend uses 'title'
                            start=event_data.get('start'),
                            end=event_data.get('end'),
                            description=event_data.get('description'),
                            location=event_data.get('location'),
                            all_day=False,
                            recurring=False,
                            recurrence_rule=None,
                            color=None,
                            calendar_id=cal_id,
                            calendar_name=cal_name
                        )
                        all_events.append(event)
                except Exception as e:
                    print(f"Error getting events from calendar '{cal_name}': {e}")
                    continue
            
            # Sort by start date
            all_events.sort(key=lambda x: x.start if x.start else datetime.min)
            return all_events
            
        except Exception as e:
            print(f"Error listing events: {e}")
            import traceback
            traceback.print_exc()
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
        
        # Get username for Radicale calendar path
        user = UserService.get_user(db, user_id)
        username = user.username if user else 'admin'
        
        calendar_name = EventService._get_calendar_name(db, calendar_id)
        if not calendar_name:
            return None
        
        # For Radicale, calendar path is username/calendar_name
        calendar_path = f"{username}/{calendar_name}"
        
        # Ensure calendar exists in CalDAV
        if not client.calendar_exists(calendar_path):
            client.create_calendar(calendar_path)
        
        try:
            # Get old event to preserve any missing fields
            old_event = client.get_event(calendar_path, event_id)
            if not old_event:
                return None
            
            # Use provided data or fall back to old data
            summary = event.summary if event.summary else old_event.get('summary', 'Unnamed Event')
            start = event.start if event.start else old_event.get('start')
            end = event.end if event.end else old_event.get('end')
            description = event.description if event.description is not None else old_event.get('description')
            location = event.location if event.location is not None else old_event.get('location')
            
            success = client.update_event(
                calendar_name=calendar_name,
                event_id=event_id,
                summary=summary,
                start=start,
                end=end,
                description=description,
                location=location
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
        
        # Get username for Radicale calendar path
        user = UserService.get_user(db, user_id)
        username = user.username if user else 'admin'
        
        calendar_name = EventService._get_calendar_name(db, calendar_id)
        if not calendar_name:
            return False
        
        # For Radicale, calendar path is username/calendar_name
        calendar_path = f"{username}/{calendar_name}"
        
        # Ensure calendar exists in CalDAV
        if not client.calendar_exists(calendar_path):
            client.create_calendar(calendar_path)
        
        try:
            return client.delete_event(calendar_path, event_id)
        except Exception as e:
            print(f"Error deleting event: {e}")
            return False
