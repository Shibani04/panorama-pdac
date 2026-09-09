from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models_db import User
from app.dependencies import require_doctor

router = APIRouter()

@router.get("/")
def list_radiologists(db: Session = Depends(get_db), doctor=Depends(require_doctor)):
    rads = db.query(User).filter(User.role == "radiologist").all()
    return [{"id": r.id, "name": r.name, "email": r.email} for r in rads]