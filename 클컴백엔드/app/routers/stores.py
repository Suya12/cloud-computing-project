from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models

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
            "minimum_price": store.minimum_price,
            "delivery_tip": store.delivery_tip
        }]

    elif category:
        stores = db.query(models.Store).filter(models.Store.category == category).all()
        if not stores:
            return []

        result = []
        for store in stores:
            result.append({
                "id": store.id,
                "name": store.name,
                "category": store.category,
                "location": store.location,
                "minimum_price": store.minimum_price,
                "delivery_tip": store.delivery_tip
            })
        return result

    else:
        raise HTTPException(status_code=400, detail="Either store_id or category must be provided.")

@router.get("/{store_id}/menus")
def get_menu(store_id: int, db: Session = Depends(get_db)):
    menus = db.query(models.Menu).filter(models.Menu.store_id == store_id).all()
    result = []
    for menu in menus:
        result.append({
            "store_id": menu.store_id,
            "id": menu.id,
            "name": menu.name,
            "price": menu.price,
        })
    return result