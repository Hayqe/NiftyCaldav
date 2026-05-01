"""
CalDAV Client for interaction with Radicale server.
Handles calendar management and event operations.
"""
import os
import re
import requests
from requests.auth import HTTPBasicAuth
import caldav
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
import icalendar
from icalendar import vCalAddress, vText
import uuid


class CalDAVClient:
    """Client for interacting with CalDAV server (Radicale)."""
    
    def __init__(self):
        self.radicale_url = os.getenv("RADICALE_URL", "http://localhost:5232")
        self.client = None
        self._connected = False
    
    def connect(self, username: str, password: str) -> bool:
        """Connect to CalDAV server with Basic Auth."""
        try:
            if self.client is not None:
                return self._connected
            
            url = f"{self.radicale_url}/"
            self.client = caldav.DAVClient(
                url=url,
                username=username,
                password=password
            )
            
            # Test connection by getting principal
            principal = self.client.principal()
            if principal:
                self._connected = True
                return True
            return False
        except Exception as e:
            print(f"Error connecting to CalDAV server: {e}")
            self.client = None
            self._connected = False
            return False
    
    def is_connected(self) -> bool:
        """Check if client is connected."""
        return self._connected and self.client is not None
    
    def disconnect(self):
        """Disconnect from CalDAV server."""
        self.client = None
        self._connected = False
    
    def get_principal(self) -> Optional[caldav.Principal]:
        """Get the principal (user) from the connected client."""
        if not self.is_connected():
            return None
        return self.client.principal()
    
    def get_calendar_color(self, calendar_url: str) -> Optional[str]:
        """Get the color of a calendar from Radicale via PROPFIND."""
        try:
            username = self.client.username if hasattr(self.client, 'username') else None
            password = self.client.password if hasattr(self.client, 'password') else "admin"
            # Clean up URL (remove trailing slash)
            url = calendar_url.rstrip('/') + '/'
            
            response = requests.request(
                'PROPFIND',
                url,
                auth=HTTPBasicAuth(username, password),
                headers={'Depth': '0'}
            )
            
            if response.status_code == 207:
                # Parse color from XML response - handle both standard and namespaced tags
                # Matches <[...]:calendar-color> OR <calendar-color>
                match = re.search(r'<(?:[^:]+:)?calendar-color>([^<]+)</(?:[^:]+:)?calendar-color>', response.text)
                if match:
                    return match.group(1)
        except Exception as e:
            print(f"Error getting calendar color: {e}")
        return None
    
    def get_calendars(self) -> List[Dict[str, Any]]:
        """Get all calendar collections for the authenticated user with colors."""
        if not self.is_connected():
            return []
        
        try:
            principal = self.get_principal()
            calendars = principal.calendars()
            
            # Get username from client
            username = self.client.username if hasattr(self.client, 'username') else None
            
            result = []
            for calendar in calendars:
                cal_url = str(calendar.url)
                
                # Fetch color
                color = self.get_calendar_color(cal_url)
                
                # Try to get displayname property properly
                # calendar.name in caldav library often returns DisplayName if available
                cal_name = None
                try:
                    cal_name = calendar.get_property(caldav.dav.DisplayName())
                except:
                    pass
                
                if not cal_name:
                    cal_name = calendar.name
                
                # If still no name, extract from URL
                if not cal_name or cal_name == cal_url:
                    from urllib.parse import urlparse
                    path = urlparse(cal_url).path.strip('/')
                    parts = [p for p in path.split('/') if p]
                    cal_name = parts[-1] if parts else "Unknown"
                
                # Try to get description property properly
                cal_desc = ""
                try:
                    cal_desc = calendar.get_property(caldav.dav.CalendarDescription())
                except:
                    pass
                
                if not cal_desc:
                    cal_desc = getattr(calendar, 'description', "")
                
                result.append({
                    "name": cal_name,
                    "url": cal_url,
                    "description": cal_desc or "",
                    "color": color or "#3b82f6",
                    "owner_username": username,
                })
            return result
        except Exception as e:
            print(f"Error getting calendars: {e}")
            return []
    
    def get_calendar(self, calendar_name: str) -> Optional[caldav.Calendar]:
        """Get a specific calendar by name or full path (username/calendar_name)."""
        if not self.is_connected():
            return None
        
        try:
            principal = self.get_principal()
            
            # Try to get calendar directly by name
            try:
                calendar = principal.calendar(name=calendar_name)
                return calendar
            except caldav.lib.error.NotFoundError:
                pass
            
            # Try to find the calendar by listing all calendars
            calendars = principal.calendars()
            for cal in calendars:
                # Check if the calendar name matches (case-insensitive, with/without user prefix)
                if calendar_name.lower() in str(cal.url).lower() or cal.name.lower() == calendar_name.lower():
                    return cal
            
            # For Radicale: if calendar_name contains username/ prefix, try with just the name part
            username = self.client.username if hasattr(self.client, 'username') else None
            if username and '/' in calendar_name:
                # Extract just the calendar name (last part after /)
                simple_name = calendar_name.split('/')[-1]
                if simple_name != calendar_name:  # Only if it's different
                    try:
                        calendar = principal.calendar(name=simple_name)
                        return calendar
                    except caldav.lib.error.NotFoundError:
                        pass
            
            return None
        except Exception as e:
            print(f"Error getting calendar '{calendar_name}': {e}")
            return None
    
    def create_calendar(self, calendar_name: str, description: str = None, color: str = None) -> Optional[caldav.Calendar]:
        """Create a new calendar using MKCALENDAR."""
        if not self.is_connected():
            return None

        try:
            # Save credentials
            username = self.client.username if hasattr(self.client, 'username') else None
            password = self.client.password if hasattr(self.client, 'password') else None

            # Clean up calendar name (replace spaces with underscores for URL)
            # Remove username prefix if present (e.g., "admin/TestCal" -> "TestCal")
            clean_name = calendar_name.replace(' ', '_')
            if username and clean_name.startswith(username + '/'):
                clean_name = clean_name[len(username) + 1:]
            url = f"{self.radicale_url}/{username}/{clean_name}/"

            # Build XML body with calendar color (Apple CalDAV standard)
            xml_body = f'''<?xml version="1.0" encoding="utf-8" ?>
    <C:mkcalendar xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:I="http://apple.com/ns/ical/">
    <D:set>
        <D:prop>
            <D:displayname>{calendar_name}</D:displayname>
            <C:calendar-description>{description or ''}</C:calendar-description>
            <I:calendar-color>{color or '#3b82f6'}</I:calendar-color>
        </D:prop>
    </D:set>
    </C:mkcalendar>'''
            
            response = requests.request(
                'MKCALENDAR',
                url,
                auth=HTTPBasicAuth(username, password),
                headers={
                    'Content-Type': 'application/xml; charset=utf-8',
                },
                data=xml_body
            )
            
            if response.status_code in (200, 201, 202, 204):
                # Refresh the client's calendar list
                self.client = None
                self.connect(username, password)
                if self.is_connected():
                    return self.get_calendar(calendar_name)
            else:
                print(f"MKCALENDAR failed with status {response.status_code}: {response.text}")
            
            return None
        except Exception as e:
            print(f"Error creating calendar '{calendar_name}': {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def calendar_exists(self, calendar_name: str) -> bool:
        """Check if a calendar exists."""
        # Try with the full path first (username/calendar_name)
        calendar = self.get_calendar(calendar_name)
        if calendar:
            return True
        
        # If calendar_name contains a username prefix, try without it
        username = self.client.username if hasattr(self.client, 'username') else None
        if username and calendar_name.startswith(username + '/'):
            # Extract just the calendar name
            calendar_name_only = calendar_name[len(username) + 1:]
            calendar = self.get_calendar(calendar_name_only)
            if calendar:
                return True
        
        return False
    
    def delete_calendar(self, calendar_name: str) -> bool:
        """Delete a calendar from Radicale."""
        if not self.is_connected():
            return False
        
        try:
            calendar = self.get_calendar(calendar_name)
            if calendar and hasattr(calendar, 'url') and calendar.url:
                # The calendar.delete() method should work
                # But sometimes the URL is None, so we need to use the URL from get_calendar
                calendar.delete()
                return True
            
            # Fallback: try with raw HTTP DELETE to the calendar URL
            # Build the calendar URL manually
            username = self.client.username if hasattr(self.client, 'username') else None
            if username:
                # Try different URL formats
                import requests
                from requests.auth import HTTPBasicAuth
                
                urls_to_try = [
                    f"{self.radicale_url}/{username}/{calendar_name}/",
                    f"{self.radicale_url}/{calendar_name}/",
                ]
                
                for try_url in urls_to_try:
                    try:
                        response = requests.request(
                            'DELETE',
                            try_url,
                            auth=HTTPBasicAuth(username, self.client.password if hasattr(self.client, 'password') else 'admin')
                        )
                        if response.status_code in (200, 204, 202, 404):
                            return True
                    except Exception:
                        continue
            
            return False
        except Exception as e:
            print(f"Error deleting calendar '{calendar_name}': {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_events(self, calendar_name: str, start: datetime = None, end: datetime = None) -> List[Dict[str, Any]]:
        """Get all events from a calendar, optionally filtered by date range."""
        print(f"DEBUG CalDAVClient.get_events: calendar_name={calendar_name}, start={start}, end={end}")
        calendar = self.get_calendar(calendar_name)
        print(f"DEBUG: calendar object={calendar}")
        if not calendar:
            print(f"DEBUG: Calendar not found: {calendar_name}")
            return []
        
        try:
            print(f"DEBUG: Fetching events from calendar {calendar_name}")
            # Get all events - caldav Calendar.events() doesn't accept date filters
            all_events = calendar.events()
            print(f"DEBUG: Found {len(all_events)} events in calendar {calendar_name}")
            
            # Filter by date range
            if start or end:
                from datetime import timezone
                events = []
                for event in all_events:
                    try:
                        ic_comp = event.icalendar_component
                        start_obj = ic_comp.get('dtstart')
                        dtstart = start_obj.dt if start_obj else None
                        
                        if dtstart:
                            # Convert date to datetime if needed
                            if isinstance(dtstart, date) and not isinstance(dtstart, datetime):
                                dtstart = datetime(dtstart.year, dtstart.month, dtstart.day)
                            
                            # Normalize timezones for comparison
                            # Ensure both dtstart and start/end are naive
                            if hasattr(dtstart, 'tzinfo') and dtstart.tzinfo is not None:
                                dtstart = dtstart.replace(tzinfo=None)
                            if start and hasattr(start, 'tzinfo') and start.tzinfo is not None:
                                start = start.replace(tzinfo=None)
                            if end and hasattr(end, 'tzinfo') and end.tzinfo is not None:
                                end = end.replace(tzinfo=None)
                            
                            # Match the filtering logic
                            if start and end:
                                if dtstart >= start and dtstart <= end:
                                    events.append(event)
                            elif start:
                                if dtstart >= start:
                                    events.append(event)
                            elif end:
                                if dtstart <= end:
                                    events.append(event)
                    except Exception as e:
                        print(f"DEBUG: Error filtering event: {e}")
                        pass
            else:
                events = all_events
            
            result = []
            for event in events:
                try:
                    # Use icalendar_component which is an icalendar.cal.Event
                    ic_comp = event.icalendar_component
                    
                    # Get summary - vText is already a string subclass
                    summary_obj = ic_comp.get('summary')
                    summary = str(summary_obj) if summary_obj else "No title"
                    
                    # Get start datetime
                    start_obj = ic_comp.get('dtstart')
                    start_dt = start_obj.dt if start_obj else None
                    is_all_day = False
                    
                    if start_dt and isinstance(start_dt, date) and not isinstance(start_dt, datetime):
                        is_all_day = True
                        # For all-day events, convert date to datetime for consistency in our API
                        start_dt = datetime(start_dt.year, start_dt.month, start_dt.day)
                    
                    # Normalize to naive datetime if timezone-aware
                    if start_dt and hasattr(start_dt, 'tzinfo') and start_dt.tzinfo is not None:
                        start_dt = start_dt.replace(tzinfo=None)
                    
                    # Get end datetime
                    end_obj = ic_comp.get('dtend')
                    end_dt = end_obj.dt if end_obj else None
                    
                    if end_dt and isinstance(end_dt, date) and not isinstance(end_dt, datetime):
                        # For all-day events, end date is often the next day (non-inclusive)
                        end_dt = datetime(end_dt.year, end_dt.month, end_dt.day)
                    
                    # Normalize to naive datetime if timezone-aware
                    if end_dt and hasattr(end_dt, 'tzinfo') and end_dt.tzinfo is not None:
                        end_dt = end_dt.replace(tzinfo=None)
                    
                    # Get description - vText is already a string subclass
                    desc_obj = ic_comp.get('description')
                    description = str(desc_obj) if desc_obj else None
                    
                    # Get location - vText is already a string subclass
                    loc_obj = ic_comp.get('location')
                    location = str(loc_obj) if loc_obj else None
                    
                    event_url = str(event.url)
                    
                    result.append({
                        "id": event_url,
                        "summary": summary,
                        "start": start_dt,
                        "end": end_dt,
                        "description": description,
                        "location": location,
                        "all_day": is_all_day,
                    })
                except Exception as e:
                    print(f"Error parsing event: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
            
            return result
        except Exception as e:
            print(f"Error getting events: {e}")
            return []
    
    def get_event(self, calendar_name: str, event_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific event by ID (URL or filename)."""
        calendar = self.get_calendar(calendar_name)
        if not calendar:
            return None
        
        try:
            # If event_id is not a full URL, construct the full URL
            # The calendar object has a url like: http://radicale:5232/admin/NewCal/
            calendar_url = str(calendar.url).rstrip('/')
            if not event_id.startswith(calendar_url):
                # Assume event_id is just the filename or path suffix
                if not event_id.startswith('/'):
                    # URL encode filename to handle special characters like @
                    from urllib.parse import quote
                    encoded_filename = quote(event_id, safe='')
                    # Just a filename, append to calendar URL
                    event_url = f"{calendar_url}/{encoded_filename}"
                else:
                    # Absolute path, use as is
                    event_url = event_id
            else:
                event_url = event_id
            
            event = calendar.event_by_url(event_url)
            ic_comp = event.icalendar_component
            
            # Get summary - vText is already a string subclass
            summary_obj = ic_comp.get('summary')
            summary = str(summary_obj) if summary_obj else None
            
            # Get start datetime
            start_obj = ic_comp.get('dtstart')
            start_dt = start_obj.dt if start_obj else None
            is_all_day = False
            
            if start_dt and isinstance(start_dt, date) and not isinstance(start_dt, datetime):
                is_all_day = True
                start_dt = datetime(start_dt.year, start_dt.month, start_dt.day)
            
            # Get end datetime
            end_obj = ic_comp.get('dtend')
            end_dt = end_obj.dt if end_obj else None
            
            if end_dt and isinstance(end_dt, date) and not isinstance(end_dt, datetime):
                end_dt = datetime(end_dt.year, end_dt.month, end_dt.day)
            
            # Get description - vText is already a string subclass
            desc_obj = ic_comp.get('description')
            description = str(desc_obj) if desc_obj else None
            
            # Get location - vText is already a string subclass
            loc_obj = ic_comp.get('location')
            location = str(loc_obj) if loc_obj else None
            
            return {
                "id": str(event.url),
                "summary": summary,
                "start": start_dt,
                "end": end_dt,
                "description": description,
                "location": location,
                "all_day": is_all_day,
            }
        except Exception as e:
            print(f"Error getting event: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def save_event_to_calendar(
        self,
        calendar: caldav.Calendar,
        summary: str,
        start: datetime,
        end: datetime,
        description: str = None,
        location: str = None,
        all_day: bool = False
    ) -> Optional[str]:
        """Low-level method to save an event directly to a calendar object."""
        try:
            cal = icalendar.Calendar()
            cal.add('prodid', '-//NiftyCaldav//NiftyCaldav//EN')
            cal.add('version', '2.0')
            
            event = icalendar.Event()
            event.add('summary', vText(summary))
            
            if all_day:
                d_start = start.date() if isinstance(start, datetime) else start
                d_end = end.date() if isinstance(end, datetime) else end
                event.add('dtstart', d_start)
                event.add('dtend', d_end + timedelta(days=1))
            else:
                event.add('dtstart', start)
                event.add('dtend', end)
            
            if description:
                event.add('description', vText(description))
            if location:
                event.add('location', vText(location))
            
            event.add('uid', str(uuid.uuid4()) + '@niftycaldav')
            cal.add_component(event)
            
            new_event = calendar.save_event(cal)
            return str(new_event.url) if new_event and hasattr(new_event, 'url') else None
        except Exception as e:
            print(f"Error saving event to calendar object: {e}", flush=True)
            return None

    def create_event(
        self, 
        calendar_name: str, 
        summary: str, 
        start: datetime, 
        end: datetime,
        description: str = None,
        location: str = None,
        all_day: bool = False
    ) -> Optional[str]:
        """Create a new event in a calendar by name. Performs lookup every time."""
        calendar = self.get_calendar(calendar_name)
        if not calendar:
            return None
        return self.save_event_to_calendar(calendar, summary, start, end, description, location, all_day)
    
    def update_event(
        self,
        calendar_name: str,
        event_id: str,
        summary: str,
        start: datetime,
        end: datetime,
        description: str = None,
        location: str = None,
        all_day: bool = False
    ) -> bool:
        """Update an existing event in CalDAV."""
        try:
            calendar = self.get_calendar(calendar_name)
            if not calendar:
                return False
            
            # Build full event URL from event_id (filename only)
            calendar_url = str(calendar.url).rstrip('/')
            from urllib.parse import quote
            encoded_event_id = quote(event_id, safe='')
            if not event_id.startswith(calendar_url):
                if not event_id.startswith('/'):
                    event_url = f"{calendar_url}/{encoded_event_id}"
                else:
                    event_url = event_id
            else:
                event_url = event_id
            
            # Get event object to extract UID
            old_event_obj = calendar.event_by_url(event_url)
            if not old_event_obj:
                return False
            ic_comp = old_event_obj.icalendar_component
            uid_obj = ic_comp.get('uid')
            uid = str(uid_obj) if uid_obj else str(uuid.uuid4()) + '@niftycaldav'
            
            # Delete old event
            old_event_obj.delete()
            
            # Create new event with same UID
            cal = icalendar.Calendar()
            cal.add('prodid', '-//NiftyCaldav//NiftyCaldav//EN')
            cal.add('version', '2.0')
            
            new_event = icalendar.Event()
            new_event.add('summary', vText(summary))
            
            if all_day:
                d_start = start.date() if isinstance(start, datetime) else start
                d_end = end.date() if isinstance(end, datetime) else end
                
                new_event.add('dtstart', d_start)
                # DTEND is exclusive for all-day events
                new_event.add('dtend', d_end + timedelta(days=1))
            else:
                new_event.add('dtstart', start)
                new_event.add('dtend', end)
            
            new_event.add('uid', uid)
            
            if description:
                new_event.add('description', vText(description))
            if location:
                new_event.add('location', vText(location))
            
            cal.add_component(new_event)
            calendar.save_event(cal)
            
            return True
            
        except Exception as e:
            print(f"Error updating event: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def delete_event(self, calendar_name: str, event_id: str) -> bool:
        """Delete an event from CalDAV."""
        try:
            calendar = self.get_calendar(calendar_name)
            if not calendar:
                return False
            
            # Build full event URL from event_id (filename only)
            calendar_url = str(calendar.url).rstrip('/')
            from urllib.parse import quote
            encoded_event_id = quote(event_id, safe='')
            if not event_id.startswith(calendar_url):
                if not event_id.startswith('/'):
                    event_url = f"{calendar_url}/{encoded_event_id}"
                else:
                    event_url = event_id
            else:
                event_url = event_id
            
            # Get event object and delete it
            event_obj = calendar.event_by_url(event_url)
            if not event_obj:
                return False
            event_obj.delete()
            return True
        except Exception as e:
            print(f"Error deleting event: {e}")
            return False
    
    def sync_calendar_with_db(
        self,
        calendar_name: str,
        db_calendar_id: int,
        owner_username: str
    ) -> bool:
        """
        Ensure the calendar exists in CalDAV and sync basic info.
        This is called when a calendar is created in our database.
        """
        try:
            if not self.is_connected():
                return False
            
            # Check if calendar exists in CalDAV
            if not self.calendar_exists(calendar_name):
                # Create it
                result = self.create_calendar(calendar_name)
                if not result:
                    print(f"Failed to create calendar '{calendar_name}' in CalDAV")
                    return False
            
            return True
        except Exception as e:
            print(f"Error syncing calendar: {e}")
            return False
