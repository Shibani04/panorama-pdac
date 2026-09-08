from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
from app.database import get_db
from app.models_db import User
from app.auth import decode_access_token

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user

def require_doctor(user: User = Depends(get_current_user)) -> User:
    if user.role != "doctor":
        raise HTTPException(403, "This action requires a doctor account")
    return user

def require_radiologist(user: User = Depends(get_current_user)) -> User:
    if user.role != "radiologist":
        raise HTTPException(403, "This action requires a radiologist account")
    return user