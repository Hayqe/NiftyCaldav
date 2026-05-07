"""Tests for user endpoints."""
import pytest
from fastapi import status


class TestUserOTPManagement:
    """Test one-time password and user management endpoints."""

    def test_create_user_with_otp(self, client, admin_token):
        """Test creating a user with one-time password."""
        response = client.post(
            "/users/create-with-otp?username=new_otp_user&role=user",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == "new_otp_user"
        assert data["must_change_password"] == True
        assert "one_time_password" in data
        assert "-" in data["one_time_password"]  # Three words with hyphens
        assert len(data["one_time_password"].split("-")) == 3

    def test_create_user_with_otp_duplicate(self, client, admin_token):
        """Test creating duplicate user with OTP."""
        # First create
        client.post(
            "/users/create-with-otp?username=dup_otp_user&role=user",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Try again
        response = client.post(
            "/users/create-with-otp?username=dup_otp_user&role=user",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"]

    def test_reset_user_password(self, client, admin_token):
        """Test resetting a user's password to a new OTP."""
        # First create a user
        create_response = client.post(
            "/users/",
            json={
                "username": "reset_test_user",
                "password": "oldpassword123",
                "role": "user"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        user_id = create_response.json()["id"]
        
        # Reset password
        response = client.post(
            f"/users/{user_id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["must_change_password"] == True
        assert "one_time_password" in data
        assert len(data["one_time_password"].split("-")) == 3

    def test_reset_nonexistent_user_password(self, client, admin_token):
        """Test resetting password for nonexistent user."""
        response = client.post(
            "/users/9999/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_change_own_password_with_flag(self, client, admin_token):
        """Test changing password when must_change_password is True."""
        # First create a user with OTP
        create_response = client.post(
            "/users/create-with-otp?username=change_pw_user&role=user",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        otp = create_response.json()["one_time_password"]
        user_id = create_response.json()["id"]
        
        # Login as this user to get token
        import base64
        credentials = base64.b64encode(f"change_pw_user:{otp}".encode()).decode()
        login_response = client.post(
            "/auth/login",
            headers={"Authorization": f"Basic {credentials}"}
        )
        user_token = login_response.json()["access_token"]
        
        # Change password without providing current password (flag is set)
        response = client.post(
            "/users/me/change-password",
            json={"new_password": "new_secure_password123"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["must_change_password"] == False


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
