"""Pytest configuration for NiftyCaldav API tests."""
import pytest
from fastapi.testclient import TestClient
import os
from contextlib import contextmanager

from src.main import app
from src.database.database import Base, engine, SessionLocal
from src.models import UserSettings, SharedCalendar, CalendarShare
from src.services.auth import AuthService
from src.services.caldav_client import CalDAVClient

# Create test database
TEST_DATABASE_URL = "sqlite:///./test.db"

# Override database URL for tests
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
# The user specified that Radicale is running and can be used.
# Default to localhost if not specified in env.
RADICALE_URL = os.getenv("RADICALE_URL", "http://localhost:5232")
os.environ["RADICALE_URL"] = RADICALE_URL
os.environ["SECRET_KEY"] = "test-secret-key"

# Create test engine and tables
test_engine = engine


@contextmanager
def get_test_db():
    """Get a test database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    """Create a test client with fresh database."""
    # Reset database
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    with get_test_db() as db:
        # Create initial user settings for admin and testuser
        # Note: Users are authenticated via Radicale, not DB
        # We only need to create settings entries for testing
        admin_settings = UserSettings(radicale_username="admin")
        db.add(admin_settings)
        
        testuser_settings = UserSettings(radicale_username="testuser")
        db.add(testuser_settings)
        
        user1_settings = UserSettings(radicale_username="user1")
        db.add(user1_settings)
        
        user2_settings = UserSettings(radicale_username="user2")
        db.add(user2_settings)
        
        user3_settings = UserSettings(radicale_username="user3")
        db.add(user3_settings)
        
        db.commit()
    
    yield TestClient(app)
    
    # Clean up DB
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def admin_token(client):
    """Get a JWT token for the admin user (authenticated via Radicale)."""
    # Authenticate with Radicale credentials
    # Radicale should have user "admin" with password "admin"
    response = client.post(
        "/auth/login",
        headers={"Authorization": "Basic YWRtaW46YWRtaW4="}  # admin:admin base64
    )
    if response.status_code != 200:
        raise Exception(f"Failed to get admin token: {response.status_code} - {response.text}")
    return response.json()["access_token"]


@pytest.fixture
def db():
    """Get a test database session."""
    # Reset database
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    db = SessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=test_engine)
