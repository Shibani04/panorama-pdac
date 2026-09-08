import os
import shutil
from datetime import datetime

UPLOAD_DIR = "uploads/ct_scans"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_ct_file(request_id: str, upload_file) -> str:
    """Saves an uploaded file to local disk, returns the filepath."""
    ext = os.path.splitext(upload_file.filename)[1] or ".nii.gz"
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{request_id}_{timestamp}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)

    return filepath