"""Tests for calendar endpoints."""
import pytest
from fastapi import status


class TestCalendars:
    """Test calendar management endpoints."""

    def test_create_calendar(self, client, admin_token):
        """Test creating a calendar."""
        response = client.post(
            "/calendars/",
            json={
                "name": "Test Calendar",
                "description": "A test calendar"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "Test Calendar"
        assert "id" in response.json()

    def test_list_calendars(self, client, admin_token):
        """Test listing calendars."""
        response = client.get(
            "/calendars/",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_get_calendar(self, client, admin_token):
        """Test getting a specific calendar."""
        # First create a calendar
        create_response = client.post(
            "/calendars/",
            json={"name": "Get Test Calendar"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        calendar_id = create_response.json()["id"]
        
        # Get the calendar
        response = client.get(
            f"/calendars/{calendar_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == calendar_id

    def test_update_calendar(self, client, admin_token):
        """Test updating a calendar."""
        # First create a calendar
        create_response = client.post(
            "/calendars/",
            json={"name": "Update Test Calendar"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        calendar_id = create_response.json()["id"]
        
        # Update the calendar
        response = client.put(
            f"/calendars/{calendar_id}",
            json={"name": "Updated Calendar"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "Updated Calendar"

    def test_delete_calendar(self, client, admin_token):
        """Test deleting a calendar."""
        # First create a calendar
        create_response = client.post(
            "/calendars/",
            json={"name": "Delete Test Calendar"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        calendar_id = create_response.json()["id"]
        
        # Delete the calendar
        response = client.delete(
            f"/calendars/{calendar_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestCalendarShares:
    """Test calendar sharing endpoints."""

    def test_share_calendar(self, client, admin_token):
        """Test sharing a calendar with another user."""
        # First create a calendar
        create_response = client.post(
            "/calendars/",
            json={"name": "Shared Calendar"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        calendar_id = create_response.json()["id"]
        
        # Share the calendar (with admin user for simplicity)
        response = client.post(
            f"/calendars/{calendar_id}/shares",
            json={
                "user_id": 1,
                "permission": "read"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["calendar_id"] == calendar_id
        assert response.json()["permission"] == "read"

    def test_get_calendar_shares(self, client, admin_token):
        """Test getting shares for a calendar."""
        # First create and share a calendar
        create_response = client.post(
            "/calendars/",
            json={"name": "Shares Test Calendar"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        calendar_id = create_response.json()["id"]
        
        client.post(
            f"/calendars/{calendar_id}/shares",
            json={"user_id": 1, "permission": "write"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Get shares
        response = client.get(
            f"/calendars/{calendar_id}/shares",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_delete_calendar_share(self, client, admin_token):
        """Test removing a calendar share."""
        # First create and share a calendar
        create_response = client.post(
            "/calendars/",
            json={"name": "Share Delete Test Calendar"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        calendar_id = create_response.json()["id"]
        
        client.post(
            f"/calendars/{calendar_id}/shares",
            json={"user_id": 1, "permission": "read"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Delete share
        response = client.delete(
            f"/calendars/{calendar_id}/shares/1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
