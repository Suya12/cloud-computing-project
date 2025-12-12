from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()
import os
if os.name == 'nt':  # 윈도우일 경우만
    import ctypes
    ctypes.windll.kernel32.SetConsoleCP(65001)
    ctypes.windll.kernel32.SetConsoleOutputCP(65001)
from sqlalchemy.orm import Session
from .. import models
from fastapi import APIRouter, Depends, HTTPException
from ..database import SessionLocal
from zoneinfo import ZoneInfo

seoul_tz = ZoneInfo("Asia/Seoul")

router = APIRouter(prefix="/notifier", tags=["notifier"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_notification(db: Session, user_id: int, title: str, message: str):
    """
    Polling 방식 알림을 위해 DB에 알림을 저장하는 함수.
    """
    notification = models.Notification(
        user_id=user_id,
        title=title,
        message=message,
        is_read=False,
        created_at=datetime.now(seoul_tz)
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification

@router.get("/notifications/{user_id}")
def get_notifications(user_id: int, db: Session = Depends(get_db)):
    notices = db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).order_by(models.Notification.created_at.desc()).all()

    return notices

@router.post("/notifications/{notification_id}/read")
def read_notification(notification_id: int, db: Session = Depends(get_db)):
    notice = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()

    if not notice:
        raise HTTPException(status_code=404, detail="Not found")

    notice.is_read = True
    db.commit()
    return {"message": "ok"}