from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models_db import CaseRequest, Patient, User, Notification
from app.dependencies import require_doctor, require_radiologist, get_current_user
from app.routers.notifications import create_notification

router = APIRouter()


class RequestCreate(BaseModel):
    patient_id: str
    radiologist_id: Optional[str] = None
    comment: Optional[str] = None


class CompleteRequest(BaseModel):
    notes: str
    referral_pathway: str


class PrescriptionUpdate(BaseModel):
    prescription: str


@router.post("/")
def create_request(payload: RequestCreate, db: Session = Depends(get_db), doctor: User = Depends(require_doctor)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id, Patient.doctor_id == doctor.id).first()
    if not patient:
        raise HTTPException(404, "Patient not found or does not belong to you")

    if payload.radiologist_id:
        rad = db.query(User).filter(User.id == payload.radiologist_id, User.role == "radiologist").first()
        if not rad:
            raise HTTPException(404, "Radiologist not found")

    req = CaseRequest(
        patient_id=patient.id,
        doctor_id=doctor.id,
        radiologist_id=payload.radiologist_id,
        doctor_notes=payload.comment,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    if req.radiologist_id:
        create_notification(db, req.radiologist_id, f"New scan request {req.id} assigned to you", req.id)
    else:
        all_rads = db.query(User).filter(User.role == "radiologist").all()
        for rad in all_rads:
            create_notification(db, rad.id, f"Unassigned scan request {req.id} is available", req.id)

    return {"success": True, "request": {"id": req.id, "status": req.status, "patient_id": req.patient_id}}


@router.get("/mine")
def list_my_requests(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == "doctor":
        reqs = db.query(CaseRequest).filter(CaseRequest.doctor_id == user.id).all()
    else:
        reqs = db.query(CaseRequest).filter(
            (CaseRequest.radiologist_id == user.id) |
            ((CaseRequest.radiologist_id.is_(None)) & (CaseRequest.status == "pending"))
        ).all()

    return [{
        "id": r.id,
        "patient_id": r.patient_id,
        "status": r.status,
        "radiologist_id": r.radiologist_id,
        "scanner": r.scanner,
        "prediction": r.prediction,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reqs]


@router.get("/{request_id}")
def get_request(request_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    req = db.query(CaseRequest).filter(CaseRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")

    is_owner_doctor = user.role == "doctor" and req.doctor_id == user.id
    is_radiologist = user.role == "radiologist"
    if not (is_owner_doctor or is_radiologist):
        raise HTTPException(403, "You do not have access to this request")

    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()

    return {
        "id": req.id,
        "status": req.status,
        "radiologist_id": req.radiologist_id,
        "scanner": req.scanner,
        "referral_pathway": req.referral_pathway,
        "prediction": req.prediction,
        "gradcam_path": req.gradcam_path,
        "segmentation_path": req.segmentation_path,
        "ct_slices": req.ct_slices,
        "shapValues": req.shap_values,
        "shap_explanation": req.shap_explanation,   # <-- new
        "confidence_label": req.confidence_label,
        "threshold": req.threshold,
        "doctor_notes": req.doctor_notes,
        "prescription": req.prescription,
        "radiologist_notes": req.radiologist_notes,
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "sex": patient.sex,
            "contact_no": patient.contact_no,
        } if patient else None,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "completed_at": req.completed_at.isoformat() if req.completed_at else None,
    }


@router.patch("/{request_id}/prescription")
def update_prescription(
    request_id: str,
    payload: PrescriptionUpdate,
    db: Session = Depends(get_db),
    doctor: User = Depends(require_doctor),
):
    req = db.query(CaseRequest).filter(
        CaseRequest.id == request_id,
        CaseRequest.doctor_id == doctor.id,
    ).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status != "reviewed":
        raise HTTPException(400, "A prescription can only be added after radiologist review")
    if not payload.prescription.strip():
        raise HTTPException(400, "Prescription cannot be empty")

    req.prescription = payload.prescription.strip()
    db.commit()
    db.refresh(req)
    return {"success": True, "request_id": req.id, "prescription": req.prescription}


@router.patch("/{request_id}/claim")
def claim_request(request_id: str, db: Session = Depends(get_db), rad: User = Depends(require_radiologist)):
    req = db.query(CaseRequest).filter(CaseRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")

    if req.radiologist_id == rad.id:
        db.query(Notification).filter(
            Notification.request_id == request_id,
        ).delete(synchronize_session=False)
        db.commit()
        return {"success": True, "message": "Request already claimed by you"}

    if req.radiologist_id is not None:
        raise HTTPException(409, "This request was just claimed by another radiologist")

    rows_updated = db.query(CaseRequest).filter(
        CaseRequest.id == request_id,
        CaseRequest.radiologist_id.is_(None),
    ).update({"radiologist_id": rad.id}, synchronize_session=False)
    db.commit()

    if rows_updated == 0:
        raise HTTPException(409, "This request was just claimed by another radiologist")

    db.query(Notification).filter(
        Notification.request_id == request_id,
    ).delete(synchronize_session=False)
    db.commit()

    return {"success": True, "message": "Request claimed"}


@router.patch("/{request_id}/complete")
def complete_request(
    request_id: str,
    payload: CompleteRequest,
    db: Session = Depends(get_db),
    rad: User = Depends(require_radiologist),
):
    req = db.query(CaseRequest).filter(CaseRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.radiologist_id != rad.id:
        raise HTTPException(403, "This request is not assigned to you")
    if req.status != "uploaded":
        raise HTTPException(400, f"Cannot complete - request must be 'uploaded' first, currently '{req.status}'")
    if payload.referral_pathway not in ("radiology", "tissue-confirmed", "external"):
        raise HTTPException(400, "referral_pathway must be 'radiology', 'tissue-confirmed', or 'external'")

    req.radiologist_notes = payload.notes
    req.referral_pathway = payload.referral_pathway
    req.status = "reviewed"
    req.completed_at = datetime.utcnow()
    db.commit()
    create_notification(db, req.doctor_id, f"Request {req.id} has been reviewed — prediction {req.prediction*100:.0f}%", req.id)

    return {"success": True, "request_id": req.id, "status": req.status}