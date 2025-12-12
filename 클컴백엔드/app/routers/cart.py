from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models

router = APIRouter(prefix="/cart", tags=["cart"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/add")
def add_to_cart(user_id: int, store_id: int, menu_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    store = db.query(models.Store).filter(models.Store.id == store_id).first()

    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    menu = db.query(models.Menu).filter(models.Menu.id == menu_id, models.Menu.store_id == store_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found in the specified store")

    # 장바구니 내 기존 아이템 확인
    cart_items = db.query(models.MenuList).filter(models.MenuList.user_id == user.id).all()
    if cart_items:
        existing_store_id = db.query(models.Menu).filter(models.Menu.id == cart_items[0].menu_id).first().store_id
        if menu.store_id != existing_store_id:
            raise HTTPException(status_code=400, detail="All items in cart must be from the same store")

    # 메뉴가 이미 장바구니에 있으면 수량 합산
    existing_item = db.query(models.MenuList).filter(
        models.MenuList.user_id == user.id,
        models.MenuList.menu_id == menu_id
    ).first()
    
    if existing_item:
        raise HTTPException(status_code=400, detail="Menu already in cart")
    else:
        cart_item = models.MenuList(
            user_id=user.id,
            menu_id=menu.id,
            price=menu.price
        )
        db.add(cart_item)
    
    db.commit()
    
    return {"message": "Menu added to cart"}

@router.get("/{user_id}")
def get_cart(user_id: int, db: Session = Depends(get_db)):
    cart_items = db.query(models.MenuList).filter(models.MenuList.user_id == user_id).all()
    
    return [
        {
            "menu_id": item.menu_id,
            "menu_name": item.menu.name,
            "price": item.price
        } for item in cart_items
    ]

@router.delete("/remove")
def remove_from_cart(user_id: int, menu_id: int, db: Session = Depends(get_db)):
    cart_item = db.query(models.MenuList).filter(
        models.MenuList.user_id == user_id,
        models.MenuList.menu_id == menu_id
    ).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    db.delete(cart_item)
    db.commit()
    
    return {"message": "Item removed from cart"}