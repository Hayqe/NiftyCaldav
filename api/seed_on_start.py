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


def main():
    """Main seed function."""
    database_url = os.getenv("DATABASE_URL", "sqlite:////data/mistral.db")
    
    # Create engine
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    
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
