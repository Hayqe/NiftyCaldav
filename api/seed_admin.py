#!/usr/bin/env python3
"""Seed script for NiftyCaldav - creates initial user_settings for admin.

Note: Users are managed exclusively in Radicale. This script only ensures
that the admin user has settings in the database.
"""
import sys
sys.path.insert(0, '/app')

from src.database.database import SessionLocal, engine, Base
from src.models import UserSettings

def seed_admin():
    """Create admin user settings if not exists.
    
    Note: Admin user must exist in Radicale with username "admin".
    This only creates the settings entry in the database.
    """
    # Create tables first
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin settings exist
        admin_settings = db.query(UserSettings).filter_by(radicale_username='admin').first()
        if not admin_settings:
            admin_settings = UserSettings(radicale_username='admin')
            db.add(admin_settings)
            db.commit()
            db.refresh(admin_settings)
            
            print(f'✓ Created admin user settings for: admin')
        else:
            print(f'✓ Admin user settings already exist for: admin')
        
        return True
    except Exception as e:
        print(f'✗ Error: {e}')
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == '__main__':
    success = seed_admin()
    sys.exit(0 if success else 1)
