from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from app.database import get_db
from app.models_db import Patient, User
from app.dependencies import require_doctor

router = APIRouter()

class PatientCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    age: Optional[int] = Field(None, ge=0, le=120)
    sex: Optional[str] = None
    contact_no: Optional[str] = None

@router.post("/")
def add_patient(payload: PatientCreate, db: Session = Depends(get_db), doctor: User = Depends(require_doctor)):
    patient = Patient(
        doctor_id=doctor.id,
        name=payload.name,
        age=payload.age,
        sex=payload.sex,
        contact_no=payload.contact_no,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return {"success": True, "patient": {
        "id": patient.id, "name": patient.name, "age": patient.age,
        "sex": patient.sex, "contact_no": patient.contact_no
    }}

@router.get("/")
def list_my_patients(db: Session = Depends(get_db), doctor: User = Depends(require_doctor)):
    patients = db.query(Patient).filter(Patient.doctor_id == doctor.id).all()
    return [{"id": p.id, "name": p.name, "age": p.age, "sex": p.sex, "contact_no": p.contact_no} for p in patients]