from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from typing import Annotated

from ..database import get_db
from ..models import User
from ..schemas.auth import Token, TokenData, LoginResponse
from ..schemas.users import UserInDB
from ..services.auth import AuthService
from ..services.users import UserService

router = APIRouter(prefix="/auth", tags=["authentication"])

security = HTTPBasic()


@router.post("/login", response_model=LoginResponse, summary="Login with username and password")
async def login(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT token.
    If must_change_password is True, returns a flag indicating password change is required.
    
    Use Basic Auth with username and password.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Login attempt for user: {credentials.username}")
    
    user = UserService.get_user_by_username(db, credentials.username)
    
    if not user:
        logger.warning(f"User not found: {credentials.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    logger.info(f"User found: {user.username}, role: {user.role}, must_change_pw: {user.must_change_password}")
    
    if not AuthService.verify_password(credentials.password, user.password_hash):
        logger.warning(f"Invalid password for user: {credentials.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    access_token = AuthService.create_token(user.id, user.username, user.role)
    logger.info(f"Login successful for user: {user.username}")
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        must_change_password=user.must_change_password
    )


@router.post("/token", response_model=Token, summary="Get token from Basic Auth")
async def get_token(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
    db: Session = Depends(get_db)
):
    """
    Alternative endpoint to get JWT token via Basic Auth.
    """
    return await login(credentials, db)
