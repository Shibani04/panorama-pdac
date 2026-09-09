from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict, Field
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


class PatientUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    age: Optional[int] = Field(None, ge=0, le=120)
    sex: Optional[str] = Field(None, max_length=10)
    contact_no: Optional[str] = Field(None, max_length=30)

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


@router.patch("/{patient_id}")
def update_patient(
    patient_id: str,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    doctor: User = Depends(require_doctor),
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == doctor.id,
    ).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    patient.age = payload.age
    patient.sex = payload.sex
    patient.contact_no = payload.contact_no
    db.commit()
    db.refresh(patient)
    return {"success": True, "patient": {
        "id": patient.id, "name": patient.name, "age": patient.age,
        "sex": patient.sex, "contact_no": patient.contact_no,
    }}