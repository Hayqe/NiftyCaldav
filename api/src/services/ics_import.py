"""
ICS Import Service for parsing and importing .ics files.
"""
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, date, timedelta
import time
import icalendar
from icalendar import Calendar


class ICSImportService:
    """
    Service for importing ICS files.
    """
    
    @staticmethod
    def parse_ics_content(ics_content: str) -> Optional[Calendar]:
        try:
            cal = Calendar.from_ical(ics_content)
            return cal
        except Exception as e:
            print(f"[IMPORT] Error parsing ICS content: {e}", flush=True)
            return None
    
    @staticmethod
    def extract_events_from_calendar(cal: Calendar) -> List[Dict[str, Any]]:
        events = []
        for component in cal.walk():
            if component.name == 'VEVENT':
                try:
                    event = ICSImportService._parse_event(component)
                    if event:
                        events.append(event)
                except Exception as e:
                    print(f"[IMPORT] Error parsing event component: {e}", flush=True)
                    continue
        return events
    
    @staticmethod
    def _parse_event(component) -> Optional[Dict[str, Any]]:
        event = {
            "summary": str(component.get('summary', 'Unnamed Event')),
            "description": str(component.get('description', '')),
            "location": str(component.get('location', '')),
        }
        
        start = component.get('dtstart')
        if start:
            event["start"] = start.dt
        else:
            return None
        
        end = component.get('dtend')
        if end:
            event["end"] = end.dt
        else:
            if hasattr(start.dt, 'hour'):
                event["end"] = start.dt + timedelta(hours=1)
            else:
                event["end"] = start.dt + timedelta(days=1)
        
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
        Import ICS file content and save events to CalDAV efficiently.
        Optimized by reusing connection and avoiding repeated lookups.
        """
        from ..services.events import EventService
        from ..services.users import UserService
        from ..services.caldav_client import CalDAVClient
        
        start_time = time.time()
        errors = []
        imported_count = 0
        
        print(f"[IMPORT] Starting optimized import for user {user_id}", flush=True)
        
        try:
            # 1. Parse ICS
            cal = ICSImportService.parse_ics_content(ics_content)
            if not cal:
                return False, "Kon het ICS-bestand niet ontleden.", 0, ["Parse error"]
            
            events_data = ICSImportService.extract_events_from_calendar(cal)
            print(f"[IMPORT] Parsed {len(events_data)} events", flush=True)
            
            if not events_data:
                return False, "Geen afspraken gevonden in het bestand.", 0, ["No events"]
            
            # 2. Setup connection ONCE
            user = UserService.get_user(db, user_id)
            if not user:
                return False, "Gebruiker niet gevonden.", 0, ["User not found"]
            
            client = CalDAVClient()
            if not client.connect(user.username, "admin"):
                return False, "Verbinding met de kalenderserver mislukt.", 0, ["Connection failed"]
            
            # 3. Resolve path and get calendar object ONCE
            calendar_path, _ = EventService._resolve_calendar_path(db, client, user_id, calendar_id)
            if not calendar_path:
                return False, "Geen toegang tot deze agenda.", 0, ["Access denied"]
            
            calendar_obj = client.get_calendar(calendar_path)
            if not calendar_obj:
                return False, "Agenda kon niet worden geladen.", 0, ["Calendar load failed"]
            
            print(f"[IMPORT] Found calendar. Importing events sequentially...", flush=True)
            
            # 4. Sequential import (Extremely fast now that overhead lookups are gone)
            for i, event_info in enumerate(events_data):
                event_name = event_info.get('summary', 'Unnamed')
                try:
                    is_all_day = False
                    start_dt = event_info.get('start')
                    if isinstance(start_dt, date) and not isinstance(start_dt, datetime):
                        is_all_day = True
                    
                    event_url = client.save_event_to_calendar(
                        calendar=calendar_obj,
                        summary=event_name,
                        description=event_info.get('description', ''),
                        location=event_info.get('location', ''),
                        start=event_info.get('start'),
                        end=event_info.get('end'),
                        all_day=is_all_day
                    )
                    
                    if event_url:
                        imported_count += 1
                        if (i + 1) % 20 == 0 or (i + 1) == len(events_data):
                            print(f"[IMPORT] Progress: {i+1}/{len(events_data)}...", flush=True)
                    else:
                        errors.append(f"Mislukt: {event_name}")
                except Exception as ex:
                    errors.append(f"Fout bij {event_name}: {str(ex)}")

            total_time = time.time() - start_time
            print(f"[IMPORT] FINISHED: {imported_count} imported in {total_time:.2f}s", flush=True)
            
            if imported_count > 0:
                msg = f"Succesvol {imported_count} events geïmporteerd"
                if errors:
                    msg += f" ({len(errors)} overgeslagen)"
                return True, msg, imported_count, errors
            
            return False, "Geen enkele afspraak kon worden geïmporteerd.", 0, errors
            
        except Exception as e:
            print(f"[IMPORT] FATAL ERROR: {str(e)}", flush=True)
            return False, f"Import mislukt: {str(e)}", 0, [str(e)]
