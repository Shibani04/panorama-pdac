from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text
from datetime import datetime
import uuid
from app.database import Base

def gen_id(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:12]}"

class User(Base):
    __tablename__ = "users"
    id = Column(String(50), primary_key=True, default=lambda: gen_id("USR"))
    name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # "doctor" or "radiologist"
    created_at = Column(DateTime, default=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"
    id = Column(String(50), primary_key=True, default=lambda: gen_id("PAT"))
    doctor_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    name = Column(String(120), nullable=False)
    age = Column(Integer)
    sex = Column(String(10))
    contact_no = Column(String(30))
    created_at = Column(DateTime, default=datetime.utcnow)

class CaseRequest(Base):
    __tablename__ = "case_requests"
    id = Column(String(50), primary_key=True, default=lambda: gen_id("REQ"))
    patient_id = Column(String(50), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    radiologist_id = Column(String(50), ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="pending")  # pending -> uploaded -> reviewed
    scanner = Column(String(50), nullable=True)
    referral_pathway = Column(String(30), nullable=True)  # radiology / tissue-confirmed / external
    ct_filepath = Column(String(255), nullable=True)
    prediction = Column(Float, nullable=True)
    gradcam_path = Column(String(255), nullable=True)
    doctor_notes = Column(Text, nullable=True)
    radiologist_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(50), primary_key=True, default=lambda: gen_id("NOT"))
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    request_id = Column(String(50), ForeignKey("case_requests.id"), nullable=True)
    message = Column(String(255), nullable=False)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)