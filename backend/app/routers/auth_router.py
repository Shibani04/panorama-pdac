from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.database import get_db
from app.models_db import User
from app.auth import hash_password, verify_password, create_access_token

router = APIRouter()


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ("doctor", "radiologist"):
            raise ValueError("Role must be 'doctor' or 'radiologist'")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")

    token = create_access_token({"sub": user.id, "role": user.role})

    return {
        "success": True,
        "access_token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }