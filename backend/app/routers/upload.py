import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models_db import CaseRequest, Patient, User
from app.dependencies import require_radiologist
from app.services.storage_service import save_ct_file
from app.services.ml_service import ml_service

router = APIRouter()

ALLOWED_EXTENSIONS = {".nii", ".nii.gz"}


def get_ct_extension(filename: str) -> str:
    """
    Returns the correct extension, handling the .nii.gz double-extension
    case explicitly - os.path.splitext() alone would truncate it to '.gz'.
    """
    lower = filename.lower()
    if lower.endswith(".nii.gz"):
        return ".nii.gz"
    return os.path.splitext(filename)[1]


@router.post("/{request_id}")
def upload_ct(
    request_id: str,
    scanner: str = Form("missing"),
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

    ext = get_ct_extension(file.filename)
    if ext == ".dcm":
        raise HTTPException(400, "DICOM (.dcm) files are not yet supported. Please upload a .nii or .nii.gz file.")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Expected .nii or .nii.gz.")

    filepath = save_ct_file(request_id, file)

    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()

    try:
        result = ml_service.predict(
            ct_filepath=filepath,
            age=patient.age if patient else None,
            sex=patient.sex if patient else None,
            scanner=scanner,
        )
    except ValueError as e:
        # Bad input the uploader can fix (e.g. unsupported .dcm right now)
        raise HTTPException(400, str(e))
    except Exception as e:
        # Model not loaded, corrupt/unreadable NIfTI, cascade failure, etc. --
        # don't leak an internal stack trace to the frontend, but do log it
        # server-side so it's debuggable.
        print(f"[upload] Inference failed for {request_id}: {e}")
        raise HTTPException(500, "Analysis failed while processing this scan. Please verify the file and try again.")

    req.ct_filepath = filepath
    req.scanner = None
    req.prediction = result["prediction"]
    req.gradcam_path = result["gradcam_path"]
    req.segmentation_path = result.get("segmentation_path")
    req.ct_slices = result.get("ct_slices")
    req.shap_values = result.get("shap_values")
    req.shap_explanation = result["shap_explanation"]
    req.confidence_label = result.get("confidence_label")
    req.threshold = result.get("threshold")
    req.status = "uploaded"
    db.commit()

    return {
        "success": True,
        "request_id": req.id,
        "prediction": req.prediction,
        "status": req.status,
    }