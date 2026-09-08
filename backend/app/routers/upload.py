from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models_db import CaseRequest, Patient, User
from app.dependencies import require_radiologist
from app.services.storage_service import save_ct_file
from app.services.ml_service import ml_service

router = APIRouter()

ALLOWED_EXTENSIONS = {".nii", ".gz", ".dcm"}

@router.post("/{request_id}")
def upload_ct(
    request_id: str,
    scanner: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    rad: User = Depends(require_radiologist),
):
    req = db.query(CaseRequest).filter(CaseRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.radiologist_id != rad.id:
        raise HTTPException(403, "This request is not assigned to you")
    if req.status not in ("pending",):
        raise HTTPException(400, f"Cannot upload - request status is already '{req.status}'")

    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS and not file.filename.lower().endswith(".nii.gz"):
        raise HTTPException(400, f"Unsupported file type '{ext}'. Expected .nii, .nii.gz, or .dcm")

    filepath = save_ct_file(request_id, file)

    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()

    result = ml_service.predict(
        ct_filepath=filepath,
        age=patient.age if patient else None,
        sex=patient.sex if patient else None,
        scanner=scanner,
    )

    req.ct_filepath = filepath
    req.scanner = scanner
    req.prediction = result["prediction"]
    req.gradcam_path = result["gradcam_path"]
    req.status = "uploaded"
    db.commit()

    return {
        "success": True,
        "request_id": req.id,
        "prediction": req.prediction,
        "status": req.status,
    }