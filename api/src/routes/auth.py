from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from typing import Annotated

from ..database import get_db
from ..schemas.auth import Token, TokenData, LoginResponse
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
    Authenticate user against Radicale and return JWT token.
    
    Uses Basic Auth with username and password.
    Authentication is done directly against Radicale, not the database.
    
    The must_change_password flag comes from the user_settings.otp field.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Login attempt for user: {credentials.username}")
    
    username = credentials.username
    password = credentials.password
    
    # Authenticate directly with Radicale
    success, role = AuthService.authenticate_with_radicale(username, password)
    
    if not success or not role:
        logger.warning(f"Invalid credentials for user: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    logger.info(f"User authenticated: {username}, role: {role}")
    
    # Check if user must change password (OTP flag in user_settings)
    must_change_password = UserService.get_otp_flag(db, username)
    logger.info(f"User {username} must_change_password: {must_change_password}")
    
    # Create JWT token
    access_token = AuthService.create_token(username, role)
    logger.info(f"Login successful for user: {username}")
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        must_change_password=must_change_password
    )


@router.post("/token", response_model=Token, summary="Get token from Basic Auth")
async def get_token(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
    db: Session = Depends(get_db)
):
    """
    Alternative endpoint to get JWT token via Basic Auth.
    Same as /login but returns just the token.
    """
    login_response = await login(credentials, db)
    return Token(
        access_token=login_response.access_token,
        token_type=login_response.token_type
    )
