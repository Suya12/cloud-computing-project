from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models
from ..schemas import UserGoogleLogin

router = APIRouter(prefix="/users", tags=["users"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def find_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user_record(db: Session, email: str, name: str):
    user = models.User(email=email, name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# 이메일로 유저 조회 API
@router.get("/by_email/{email}")
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    return find_user_by_email(db, email)

# 구글 로그인
@router.post("/google-login")
def google_login(user: UserGoogleLogin, db: Session = Depends(get_db)):
    existing_user = find_user_by_email(db, user.email)

    if existing_user:
        return {
            "id": existing_user.id,
            "email": existing_user.email,
            "name": existing_user.name
        }

    new_user = create_user_record(
        db=db,
        email=user.email,
        name=user.name
    )

    return {
        "id": new_user.id,
        "email": new_user.email,
        "name": new_user.name
    }

@router.post("/credit/add/{user_id}")
def add_credit(user_id: int, amount: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.credit += amount
    db.commit()
    db.refresh(user)

    return {"id": user.id, "new_credit": user.credit}


@router.get("/credit/get/{user_id}")
def get_credit(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": user.id, "credit": user.credit}


@router.put("/{user_id}/address")
def update_user_address(
    user_id: int,
    address: str,
    lat: float,
    lng: float,
    detailed_address: str | None = None,
    db: Session = Depends(get_db)
):
    """사용자 배달 주소를 업데이트합니다."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.address = address
    user.detailed_address = detailed_address
    user.latitude = lat
    user.longitude = lng

    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "user_id": user.id,
        "address": address,
        "detailed_address": detailed_address,
        "latitude": lat,
        "longitude": lng
    }