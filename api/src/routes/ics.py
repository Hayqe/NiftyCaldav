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
    """
    print(f"[ROUTE] Received ICS import request for calendar {calendar_id}", flush=True)
    try:
        # Read file content
        print(f"[ROUTE] Reading file: {file.filename}", flush=True)
        content = await file.read()
        print(f"[ROUTE] File read complete. Size: {len(content)} bytes", flush=True)
        
        ics_content = content.decode('utf-8')
        
        # Import ICS
        success, message, imported_count, errors = ICSImportService.import_ics_to_calendar(
            db, ics_content, current_user.id, calendar_id
        )
        
        if not success:
            print(f"[ROUTE] Import failed: {message}", flush=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        print(f"[ROUTE] Import successful: {imported_count} events", flush=True)
        return ICSImportResult(
            success=True,
            message=message,
            imported_count=imported_count,
            errors=errors,
            calendar_id=calendar_id
        )
        
    except Exception as e:
        print(f"[ROUTE] CRITICAL ERROR: {str(e)}", flush=True)
        if isinstance(e, HTTPException):
            raise e
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
    """
    import httpx
    
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
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import ICS file: {str(e)}"
        )
