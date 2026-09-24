import os
from datetime import datetime

def get_ct_extension(filename: str) -> str:
    """
    Returns the correct extension, handling the .nii.gz double-extension
    case explicitly — os.path.splitext() alone would truncate it to '.gz'.
    """
    lower = filename.lower()
    if lower.endswith(".nii.gz"):
        return ".nii.gz"
    return os.path.splitext(filename)[1]  # .nii, .dcm, etc.

def save_ct_file(request_id: str, file) -> str:
    ext = get_ct_extension(file.filename)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    dest_name = f"{request_id}_{timestamp}{ext}"
    dest_path = os.path.join("uploads/ct_scans", dest_name)
    with open(dest_path, "wb") as f:
        f.write(file.file.read())
    return dest_path