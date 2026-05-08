"""
Seed script to create initial database tables.

Note: Users are now authenticated via Radicale, not stored in database.
This script only creates the database tables and initial settings entries.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .database import Base
from ..models import UserSettings, SharedCalendar, CalendarShare


def seed_database(database_url: str = None):
    """Create tables and seed initial data."""
    if database_url is None:
        database_url = os.getenv("DATABASE_URL", "sqlite:///./mistral.db")
    
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Create initial user settings for default users
        # These are keyed by radicale_username
        users_to_seed = ["admin", "testuser", "user1", "user2", "user3"]
        
        for username in users_to_seed:
            settings = db.query(UserSettings).filter_by(radicale_username=username).first()
            if not settings:
                settings = UserSettings(radicale_username=username)
                db.add(settings)
                print(f"✓ Created settings for user: {username}")
        
        db.commit()
        
        # Count settings
        settings_count = db.query(UserSettings).count()
        shared_cal_count = db.query(SharedCalendar).count()
        
        print(f"✓ Database seeded successfully")
        print(f"  - User Settings: {settings_count}")
        print(f"  - Shared Calendars: {shared_cal_count}")
        print(f"\nNote: Users are authenticated via Radicale. Ensure Radicale has users:")
        print(f"  - admin:admin (admin role)")
        print(f"  - testuser:testpass")
        print(f"  - user1:user1")
        print(f"  - user2:user2")
        print(f"  - user3:user3")
        
    except Exception as e:
        print(f"✗ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
