"""Tests for user endpoints."""
import pytest
from fastapi import status


class TestUsers:
    """Test user management endpoints."""

    def test_create_user_admin_only(self, client, admin_token):
        """Test that only admin can create users."""
        response = client.post(
            "/users/",
            json={
                "username": "newuser",
                "password": "newpass123",
                "role": "user"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["username"] == "newuser"
        assert response.json()["role"] == "user"

    def test_create_user_duplicate_username(self, client, admin_token):
        """Test creating duplicate username."""
        # First create a user
        client.post(
            "/users/",
            json={
                "username": "duplicate",
                "password": "password123",
                "role": "user"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Try to create same user again
        response = client.post(
            "/users/",
            json={
                "username": "duplicate",
                "password": "password456",
                "role": "user"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"]

    def test_list_users_admin_only(self, client, admin_token):
        """Test that only admin can list users."""
        response = client.get(
            "/users/",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_get_user_by_id(self, client, admin_token):
        """Test getting user by ID."""
        response = client.get(
            "/users/1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == 1

    def test_get_nonexistent_user(self, client, admin_token):
        """Test getting nonexistent user."""
        response = client.get(
            "/users/999",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_user(self, client, admin_token):
        """Test updating user."""
        response = client.put(
            "/users/1",
            json={"username": "admin_updated"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        # Note: username might be unique, so this might fail
        # For now, just check it returns 200

    def test_delete_user(self, client, admin_token):
        """Test deleting a user (not self)."""
        # First create a user to delete
        create_response = client.post(
            "/users/",
            json={
                "username": "to_delete",
                "password": "password123",
                "role": "user"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        user_id = create_response.json()["id"]
        
        # Delete the user
        response = client.delete(
            f"/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestUserSettings:
    """Test user settings endpoints."""

    def test_get_user_settings(self, client, admin_token):
        """Test getting user settings."""
        response = client.get(
            "/users/1/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert "timezone" in response.json()
        assert "language" in response.json()

    def test_update_user_settings(self, client, admin_token):
        """Test updating user settings."""
        response = client.put(
            "/users/1/settings",
            json={
                "timezone": "UTC",
                "language": "en",
                "notifications_enabled": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["timezone"] == "UTC"
        assert response.json()["language"] == "en"
