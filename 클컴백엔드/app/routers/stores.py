from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models
import re

router = APIRouter(prefix="/stores", tags=["stores"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_stores(store_id: int | None = None, category: str | None = None, db: Session = Depends(get_db)):
    if store_id:
        store = db.query(models.Store).filter(models.Store.id == store_id).first()
        if not store:
            raise HTTPException(status_code=404, detail="Store not found.")

        return [{
            "id": store.id,
            "name": store.name,
            "category": store.category,
            "location": store.location,
            "latitude": store.latitude,
            "longitude": store.longitude,
            "minimum_price": store.minimum_price,
            "delivery_tip": store.delivery_tip
        }]

    elif category:
        stores = db.query(models.Store).filter(models.Store.category == category).all()
        if not stores:
            return []

        return [{
            "id": store.id,
            "name": store.name,
            "category": store.category,
            "location": store.location,
            "latitude": store.latitude,
            "longitude": store.longitude,
            "minimum_price": store.minimum_price,
            "delivery_tip": store.delivery_tip
        } for store in stores]

    else:
        raise HTTPException(status_code=400, detail="Either store_id or category must be provided.")

@router.get("/{store_id}/menus")
def get_menu(store_id: int, db: Session = Depends(get_db)):
    menus = db.query(models.Menu).filter(models.Menu.store_id == store_id).all()
    return [{
        "store_id": menu.store_id,
        "id": menu.id,
        "name": menu.name,
        "price": menu.price,
    } for menu in menus]

def extract_city(address: str):
    """주소에서 시(市) 이름을 추출합니다."""
    match = re.search(r'(\S+시)', address)
    return match.group(1) if match else None

@router.get("/by-city")
def get_stores_by_city(user_address: str, db: Session = Depends(get_db)):
    """사용자 주소 기반으로 같은 도시의 가게들을 조회합니다."""
    city = extract_city(user_address)
    if not city:
        return []

    stores = (
        db.query(models.Store)
        .filter(models.Store.location.like(f"%{city}%"))
        .all()
    )
    return [{
        "id": store.id,
        "name": store.name,
        "category": store.category,
        "location": store.location,
        "latitude": store.latitude,
        "longitude": store.longitude,
        "minimum_price": store.minimum_price,
        "delivery_tip": store.delivery_tip
    } for store in stores]