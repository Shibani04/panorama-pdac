from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models_db import Notification, User
from app.dependencies import get_current_user

router = APIRouter()

@router.get("/mine")
def list_my_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notes = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(30).all()
    return [{
        "id": n.id,
        "message": n.message,
        "request_id": n.request_id,
        "is_read": bool(n.is_read),
        "created_at": n.created_at.isoformat() if n.created_at else None,
    } for n in notes]

@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read == 0).count()
    return {"count": count}

@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    note = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if not note:
        raise HTTPException(404, "Notification not found")
    note.is_read = 1
    db.commit()
    return {"success": True}

@router.patch("/read-all")
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read == 0).update({"is_read": 1})
    db.commit()
    return {"success": True}

def create_notification(db: Session, user_id: str, message: str, request_id: str = None):
    note = Notification(user_id=user_id, message=message, request_id=request_id)
    db.add(note)
    db.commit()