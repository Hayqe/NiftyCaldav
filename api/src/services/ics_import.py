"""
ICS Import Service for parsing and importing .ics files.
For now, stores events in memory/display. Full CalDAV integration TBD.
"""
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
import icalendar
from icalendar import Calendar


class ICSImportService:
    """
    Service for importing ICS files.
    Currently parses and validates ICS files, returns structured data.
    Full CalDAV integration will be added in a future iteration.
    """
    
    @staticmethod
    def parse_ics_content(ics_content: str) -> Optional[Calendar]:
        """
        Parse ICS file content and return iCalendar object.
        
        Args:
            ics_content: String content of ICS file
            
        Returns:
            iCalendar object or None if parsing fails
        """
        try:
            cal = Calendar.from_ical(ics_content)
            return cal
        except Exception as e:
            print(f"Error parsing ICS content: {e}")
            return None
    
    @staticmethod
    def parse_ics_file(file_path: str) -> Optional[Calendar]:
        """
        Parse ICS file from path.
        
        Args:
            file_path: Path to ICS file
            
        Returns:
            iCalendar object or None if parsing fails
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return ICSImportService.parse_ics_content(content)
        except Exception as e:
            print(f"Error reading ICS file: {e}")
            return None
    
    @staticmethod
    def extract_events_from_calendar(cal: Calendar) -> List[Dict[str, Any]]:
        """
        Extract events from iCalendar object.
        
        Args:
            cal: iCalendar object
            
        Returns:
            List of event dictionaries
        """
        events = []
        
        for component in cal.walk():
            if component.name == 'VEVENT':
                try:
                    event = ICSImportService._parse_event(component)
                    if event:
                        events.append(event)
                except Exception as e:
                    print(f"Error parsing event: {e}")
                    continue
        
        return events
    
    @staticmethod
    def _parse_event(component) -> Optional[Dict[str, Any]]:
        """
        Parse a single VEVENT component into a dictionary.
        
        Args:
            component: iCalendar VEVENT component
            
        Returns:
            Dictionary with event data or None
        """
        from datetime import timedelta
        
        event = {
            "summary": str(component.get('summary', 'Unnamed Event')),
            "description": str(component.get('description', '')),
            "location": str(component.get('location', '')),
        }
        
        # Parse start date/time
        start = component.get('dtstart')
        if start:
            event["start"] = start.dt
        else:
            return None
        
        # Parse end date/time
        end = component.get('dtend')
        if end:
            event["end"] = end.dt
        else:
            # If no end time, assume same day or 1 hour duration
            if hasattr(start.dt, 'hour'):
                # datetime object
                event["end"] = start.dt + timedelta(hours=1)
            else:
                # date object - all day event
                event["end"] = start.dt + timedelta(days=1)
        
        # Parse UID (unique identifier)
        uid = component.get('uid')
        if uid:
            event["uid"] = str(uid)
        
        return event
    
    @staticmethod
    def import_ics_to_calendar(
        db: Any,
        ics_content: str,
        user_id: int,
        calendar_id: int
    ) -> Tuple[bool, str, int, List[str]]:
        """
        Import ICS file content and return parsed events.
        
        Note: This currently parses and validates the ICS file, returning
        the extracted event data. Full CalDAV integration is planned for
        a future iteration.
        
        Args:
            db: Database session
            ics_content: ICS file content as string
            user_id: ID of the user importing
            calendar_id: ID of the target calendar
            
        Returns:
            Tuple of (success, message, imported_count, errors)
        """
        from ..models import Calendar
        from ..services.calendars import CalendarService
        from datetime import timedelta
        
        errors = []
        imported_count = 0
        
        try:
            # Get calendar name for display
            calendar = CalendarService.get_calendar(db, calendar_id)
            if not calendar:
                return False, "Calendar not found", 0, ["Calendar not found"]
            
            # Parse ICS
            cal = ICSImportService.parse_ics_content(ics_content)
            if not cal:
                return False, "Failed to parse ICS file", 0, ["Invalid ICS format"]
            
            # Extract events
            events_data = ICSImportService.extract_events_from_calendar(cal)
            if not events_data:
                return False, "No events found in ICS file", 0, ["No events found"]
            
            # For now, just return success with event count
            # In production, these would be created in CalDAV
            imported_count = len(events_data)
            
            message = f"Successfully parsed {imported_count} events from ICS file"
            
            return True, message, imported_count, errors
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return False, f"Import failed: {str(e)}", 0, [str(e)]
