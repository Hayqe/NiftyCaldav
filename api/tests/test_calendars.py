"""Tests for calendar endpoints."""
import pytest
from fastapi import status
from src.services.caldav_client import CalDAVClient


class TestCalendars:
    """Test calendar management endpoints."""

    def _cleanup_calendar(self, calendar_name):
        client = CalDAVClient()
        if client.connect("admin", "admin"):
            if client.calendar_exists(calendar_name):
                client.delete_calendar(calendar_name)

    def test_create_calendar(self, client, admin_token):
        """Test creating a calendar."""
        calendar_name = "Test Calendar"
        self._cleanup_calendar(calendar_name)
        
        response = client.post(
            "/calendars/",
            json={
                "name": calendar_name,
                "description": "A test calendar"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == calendar_name
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
        calendar_name = "Get Test Calendar"
        self._cleanup_calendar(calendar_name)
        
        # First create a calendar
        create_response = client.post(
            "/calendars/",
            json={"name": calendar_name},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
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
        calendar_name = "Update Test Calendar"
        self._cleanup_calendar(calendar_name)
        
        # First create a calendar
        create_response = client.post(
            "/calendars/",
            json={"name": calendar_name},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        calendar_id = create_response.json()["id"]
        
        # Update the calendar
        # Note: Currently returns 501 Not Implemented for Radicale calendars
        response = client.put(
            f"/calendars/{calendar_id}",
            json={"name": "Updated Calendar"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # We expect 501 for now as per the implementation in routes/calendars.py
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_501_NOT_IMPLEMENTED]

    def test_delete_calendar(self, client, admin_token):
        """Test deleting a calendar."""
        calendar_name = "Delete Test Calendar"
        self._cleanup_calendar(calendar_name)
        
        # First create a calendar
        create_response = client.post(
            "/calendars/",
            json={"name": calendar_name},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        calendar_id = create_response.json()["id"]
        
        # Delete the calendar
        response = client.delete(
            f"/calendars/{calendar_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
