#!/usr/bin/env python3
"""
Seed script that runs when the container starts.
Creates database tables and ensures admin user settings exist.

Note: Users are managed exclusively in Radicale. This script only:
1. Creates database tables
2. Creates initial user_settings for common users

Users themselves must be created in Radicale.
"""
import os
import sys
sys.path.insert(0, '/app')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.database.database import Base
from src.models import UserSettings


def main():
    """Main seed function."""
    database_url = os.getenv("DATABASE_URL", "sqlite:////data/mistral.db")
    
    # Create engine
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created")
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # List of users that should have settings pre-created
        # These users must exist in Radicale
        users_to_seed = ['admin']
        
        for username in users_to_seed:
            settings = db.query(UserSettings).filter_by(radicale_username=username).first()
            if not settings:
                settings = UserSettings(radicale_username=username)
                db.add(settings)
                print(f"✓ Created user settings for: {username}")
        
        if users_to_seed:
            db.commit()
            print(f"✓ Database seeded successfully with {len(users_to_seed)} user settings")
        
    except Exception as e:
        print(f"✗ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
