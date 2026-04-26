"""Tests for authentication endpoints."""
import pytest
from fastapi import status


class TestAuth:
    """Test authentication endpoints."""

    def test_login_success(self, client):
        """Test successful login returns JWT token."""
        response = client.post(
            "/auth/login",
            headers={"Authorization": "Basic YWRtaW46YWRtaW4="}  # admin:admin
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()
        assert "token_type" in response.json()
        assert response.json()["token_type"] == "bearer"

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        response = client.post(
            "/auth/login",
            headers={"Authorization": "Basic invalid:credentials"}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        # The error message may vary, just check it's unauthorized
        assert "detail" in response.json()

    def test_login_nonexistent_user(self, client):
        """Test login with nonexistent user."""
        import base64
        credentials = base64.b64encode(b"nonexistent:password").decode()
        response = client.post(
            "/auth/login",
            headers={"Authorization": f"Basic {credentials}"}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestProtectedRoutes:
    """Test routes that require authentication."""

    def test_users_me_unauthorized(self, client):
        """Test /users/me without authentication."""
        response = client.get("/users/me")
        # May return 401 or 403 depending on auth setup
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_users_me_authorized(self, client, admin_token):
        """Test /users/me with valid token."""
        response = client.get(
            "/users/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["username"] == "admin"
        assert response.json()["role"] == "admin"
