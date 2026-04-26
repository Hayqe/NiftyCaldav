"""
Seed script to create initial admin user and database tables.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .database import Base
from ..models import User, UserSettings
from ..services.auth import AuthService


def seed_database(database_url: str = None):
    """Create tables and seed initial admin user."""
    if database_url is None:
        database_url = os.getenv("DATABASE_URL", "sqlite:///./mistral.db")
    
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if admin already exists
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
        else:
            print(f"✓ Admin user already exists (ID: {admin.id})")
        
        # Count users and calendars
        user_count = db.query(User).count()
        calendar_count = db.query(User).count()
        
        print(f"✓ Database seeded successfully")
        print(f"  - Users: {user_count}")
        
    except Exception as e:
        print(f"✗ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
