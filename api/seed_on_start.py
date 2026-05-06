#!/usr/bin/env python3
"""
Seed script that runs when the container starts.
Creates admin user if not exists and ensures database tables exist.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import after path is set
import sys
sys.path.insert(0, '/app')

from src.database.database import Base
from src.models import User, UserSettings
from src.services.auth import AuthService


def run_migrations(engine):
    """Run any pending database migrations."""
    from sqlalchemy import text
    
    with engine.connect() as conn:
        # Check if columns exist and add them if not
        result = conn.execute(text("PRAGMA table_info(calendars)")).fetchall()
        column_names = [col[1] for col in result]
        
        print(f"Checking calendars table columns: {column_names}")
        
        # Add missing columns
        if 'system_username' not in column_names:
            conn.execute(text("ALTER TABLE calendars ADD COLUMN system_username VARCHAR"))
            print("✓ Added system_username column")
        
        if 'system_password' not in column_names:
            conn.execute(text("ALTER TABLE calendars ADD COLUMN system_password VARCHAR"))
            print("✓ Added system_password column")
        
        if 'is_shared_calendar' not in column_names:
            conn.execute(text("ALTER TABLE calendars ADD COLUMN is_shared_calendar BOOLEAN DEFAULT 0"))
            print("✓ Added is_shared_calendar column")
        
        conn.commit()


def main():
    """Main seed function."""
    database_url = os.getenv("DATABASE_URL", "sqlite:////data/mistral.db")
    
    # Create engine
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    
    # Run migrations first
    run_migrations(engine)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            # Create admin user
            admin = User(
                username="admin",
                password_hash=AuthService.hash_password("admin"),
                role="admin"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            
            # Create admin settings
            settings = UserSettings(user_id=admin.id)
            db.add(settings)
            db.commit()
            
            print(f"✓ Created admin user with ID: {admin.id}")
            print(f"✓ Database seeded successfully")
        else:
            print(f"✓ Admin user already exists (ID: {admin.id})")
        
    except Exception as e:
        print(f"✗ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
