"""Pytest configuration for NiftyCaldav API tests."""
import pytest
from fastapi.testclient import TestClient
import os
from contextlib import contextmanager

from src.main import app
from src.database.database import Base, engine, SessionLocal
from src.models import User, UserSettings
from src.services.auth import AuthService

# Create test database
TEST_DATABASE_URL = "sqlite:///./test.db"

# Override database URL for tests
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["RADICALE_URL"] = "http://localhost:5232"
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
    
    # Clean up
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def admin_token(client):
    """Get a JWT token for the admin user."""
    response = client.post(
        "/auth/login",
        headers={"Authorization": "Basic YWRtaW46YWRtaW4="}
    )
    return response.json()["access_token"]
