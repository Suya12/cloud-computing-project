from sqlalchemy.orm import Session
from . import models
from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException
from .database import SessionLocal

seoul_tz = ZoneInfo("Asia/Seoul")

router = APIRouter(prefix="/match", tags=["match"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def match_order(db: Session, order_id: int, matched_user_id: int):
    # 1. Order 조회
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        return None, False, "Order not found"

    if order.status != "pending":
        return None, False, f"Order status is '{order.status}', cannot match"

    # 2. Owner 조회
    owner = db.query(models.User).filter(models.User.id == order.owner_id).first()

    # 3. matched_user 조회
    matched_user = db.query(models.User).filter(models.User.id == matched_user_id).first()
    if not matched_user:
        return None, False, "Matched user not found"

    if matched_user.id == owner.id:
        return None, False, "Cannot match your own order"

    # 4. store 조회
    store = db.query(models.Store).filter(models.Store.id == order.store_id).first()
    if not store:
        return None, False, "Store not found"

    # --- Owner의 주문 금액 계산 ---
    owner_items = db.query(models.OrderItem).filter(
        models.OrderItem.order_id == order.id,
        models.OrderItem.user_id == owner.id
    ).all()
    owner_total = sum(item.price for item in owner_items)

    # --- matched_user 장바구니 조회 ---
    cart_items = db.query(models.MenuList).filter(
        models.MenuList.user_id == matched_user.id
    ).all()
    matched_total = sum(item.price for item in cart_items) if cart_items else 0

    # --- 전체 주문 금액 ---
    total_price = owner_total + matched_total

    # --- 최소 주문 금액 검증 ---
    if total_price < store.minimum_price:
        return None, False, "Total order price is below store minimum order price"

    # --- 금액 처리 ---
    if order.split_type:
        split_amount = int(order.owner_paid_amount)
        if matched_user.credit < split_amount:
            return None, False, "Matched user has insufficient credit"
        matched_user.credit -= split_amount
    else:
        for item in cart_items:
            if item.menu.store_id != order.store_id:
                return None, False, "Cart contains menu from a different store"
        if matched_total <= 0:
            return None, False, "Matched user cart is empty"
        if matched_user.credit < matched_total:
            return None, False, "Matched user has insufficient credit"
        matched_user.credit -= int(matched_total + store.delivery_tip / 2)

    # --- OrderItem 생성 + 장바구니 비우기 ---
    for item in cart_items:
        db.add(models.OrderItem(
            order_id=order.id,
            user_id=matched_user.id,
            menu_id=item.menu_id,
            price=item.price
        ))
        db.delete(item)

    # --- Order 상태 변경 (삭제하지 않음) ---
    order.status = "matched"

    db.commit()
    db.refresh(matched_user)
    db.refresh(order)

    return order, True, None
