from .auth import router as auth_router
from .users import router as users_router
from .calendars import router as calendars_router
from .events import router as events_router
from .ics import router as ics_router
from .settings import router as settings_router

__all__ = ["auth_router", "users_router", "calendars_router", "events_router", "ics_router", "settings_router"]
