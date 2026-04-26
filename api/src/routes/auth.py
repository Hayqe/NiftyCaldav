from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from typing import Annotated

from ..database import get_db
from ..models import User
from ..schemas.auth import Token, TokenData
from ..schemas.users import UserInDB
from ..services.auth import AuthService
from ..services.users import UserService

router = APIRouter(prefix="/auth", tags=["authentication"])

security = HTTPBasic()


@router.post("/login", response_model=Token, summary="Login with username and password")
async def login(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT token.
    
    Use Basic Auth with username and password.
    """
    user = UserService.get_user_by_username(db, credentials.username)
    
    if not user or not AuthService.verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    access_token = AuthService.create_token(user.id, user.username, user.role)
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/token", response_model=Token, summary="Get token from Basic Auth")
async def get_token(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
    db: Session = Depends(get_db)
):
    """
    Alternative endpoint to get JWT token via Basic Auth.
    """
    return await login(credentials, db)
