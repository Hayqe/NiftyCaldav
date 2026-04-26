#!/usr/bin/env python3
"""Seed admin user for NiftyCaldav."""
import sys
sys.path.insert(0, '/app')

from src.database.database import SessionLocal, engine, Base
from src.models import User, UserSettings
from src.services.auth import AuthService

def seed_admin():
    """Create admin user if not exists."""
    # Create tables first
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.username == 'admin').first()
        if not admin:
            admin = User(
                username='admin',
                password_hash=AuthService.hash_password('admin'),
                role='admin'
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            
            settings = UserSettings(user_id=admin.id)
            db.add(settings)
            db.commit()
            
            print(f'✓ Created admin user with ID: {admin.id}')
        else:
            print(f'✓ Admin user already exists with ID: {admin.id}')
        
        return True
    except Exception as e:
        print(f'✗ Error: {e}')
        return False
    finally:
        db.close()

if __name__ == '__main__':
    success = seed_admin()
    sys.exit(0 if success else 1)
