"""Pytest configuration for NiftyCaldav API tests."""
import pytest
from fastapi.testclient import TestClient
import os
from contextlib import contextmanager

from src.main import app
from src.database.database import Base, engine, SessionLocal
from src.models import User, UserSettings, Calendar
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
        # Create admin user
        # Note: Radicale user 'admin' with password 'admin' should exist
        admin = User(
            username="admin",
            password_hash=AuthService.hash_password("admin"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        settings = UserSettings(user_id=admin.id)
        db.add(settings)
        db.commit()
    
    yield TestClient(app)
    
    # Clean up DB
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def admin_token(client):
    """Get a JWT token for the admin user."""
    response = client.post(
        "/auth/login",
        headers={"Authorization": "Basic YWRtaW46YWRtaW4="}
    )
    return response.json()["access_token"]


@pytest.fixture
def test_calendar(client, admin_token):
    """Fixture to create and clean up a test calendar in Radicale."""
    calendar_name = "IntegrationTestCalendar"
    
    # Pre-cleanup: ensure it doesn't exist
    client_caldav = CalDAVClient()
    if client_caldav.connect("admin", "admin"):
        if client_caldav.calendar_exists(calendar_name):
            client_caldav.delete_calendar(calendar_name)
    
    # Create calendar via API
    response = client.post(
        "/calendars/",
        json={
            "name": calendar_name,
            "description": "Calendar for integration tests"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if response.status_code != 200:
        print(f"DEBUG: Calendar creation failed with {response.status_code}: {response.text}")
    assert response.status_code == 200
    calendar_data = response.json()
    
    yield calendar_data
    
    # Cleanup: Delete calendar via API
    client.delete(
        f"/calendars/{calendar_data['id']}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
