"""
ICS Import routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Annotated
from datetime import datetime

from ..database import get_db
from ..models import User, Calendar
from ..schemas.ics import ICSImportResult, ICSImportRequest
from ..services.ics_import import ICSImportService
from ..services.calendars import CalendarService
from .dependencies import get_current_active_user

router = APIRouter(prefix="/ics", tags=["ics"])


@router.post("/import", response_model=ICSImportResult, summary="Import ICS file")
async def import_ics(
    calendar_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Import an ICS file into a calendar.
    
    The file should be uploaded as multipart/form-data with field name 'file'.
    
    User must have write access to the specified calendar.
    """
    # Verify calendar exists
    calendar = CalendarService.get_calendar(db, calendar_id)
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and current_user.id != calendar.owner_id:
        shares = CalendarService.get_shares_for_calendar(db, calendar_id)
        has_write = any(
            share.user_id == current_user.id and share.permission in ["write", "admin"]
            for share in shares
        )
        if not has_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No write permission for this calendar"
            )
    
    try:
        # Read file content
        content = await file.read()
        ics_content = content.decode('utf-8')
        
        # Import ICS
        success, message, imported_count, errors = ICSImportService.import_ics_to_calendar(
            db, ics_content, current_user.id, calendar_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return ICSImportResult(
            success=True,
            message=message,
            imported_count=imported_count,
            errors=errors,
            calendar_id=calendar_id
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import ICS file: {str(e)}"
        )


@router.post("/import-from-url", response_model=ICSImportResult, summary="Import ICS from URL")
async def import_ics_from_url(
    request: ICSImportRequest,
    ics_url: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Import an ICS file from a URL into a calendar.
    
    This allows importing from public ICS calendar feeds.
    """
    import httpx
    
    # Verify calendar exists
    calendar = CalendarService.get_calendar(db, request.calendar_id)
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and current_user.id != calendar.owner_id:
        shares = CalendarService.get_shares_for_calendar(db, request.calendar_id)
        has_write = any(
            share.user_id == current_user.id and share.permission in ["write", "admin"]
            for share in shares
        )
        if not has_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No write permission for this calendar"
            )
    
    try:
        # Fetch ICS from URL
        async with httpx.AsyncClient() as client:
            response = await client.get(ics_url)
            response.raise_for_status()
            ics_content = response.text
        
        # Import ICS
        success, message, imported_count, errors = ICSImportService.import_ics_to_calendar(
            db, ics_content, current_user.id, request.calendar_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return ICSImportResult(
            success=True,
            message=message,
            imported_count=imported_count,
            errors=errors,
            calendar_id=request.calendar_id
        )
        
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch ICS from URL: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import ICS file: {str(e)}"
        )
