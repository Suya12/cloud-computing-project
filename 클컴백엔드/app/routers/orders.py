from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models
from ..schemas import OrderCreate
from datetime import datetime
from zoneinfo import ZoneInfo
from datetime import timedelta
import asyncio
from ..utils.scheduler import start_timeout_task
from ..utils.distance import distance

seoul_tz = ZoneInfo("Asia/Seoul")

router = APIRouter(prefix="/orders", tags=["orders"])

# DB 세션 의존성 주입
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
async def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    # 1. 주문 생성자(User) 조회
    user = db.query(models.User).filter(models.User.id == order.creator_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. User 장바구니(MenuList) 조회
    cart_items = db.query(models.MenuList).filter(models.MenuList.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="User cart is empty")

    # 2-1. 장바구니 첫 메뉴 → store_id 가져오기
    first_menu = db.query(models.Menu).filter(
        models.Menu.id == cart_items[0].menu_id
    ).first()

    if not first_menu:
        raise HTTPException(status_code=404, detail="Cart item contains invalid menu")

    store = db.query(models.Store).filter(
        models.Store.id == first_menu.store_id
    ).first()

    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    # 3. 총 금액 계산
    total_price = sum(item.price for item in cart_items)

    # 4. Split type / minimum_price 체크
    if order.split_type:
        if total_price < store.minimum_price:
            raise HTTPException(status_code=400, detail="Total menu price is below store minimum")
        owner_pay = total_price / 2 + store.delivery_tip / 2
    else:
        owner_pay = total_price + store.delivery_tip / 2

    # 크레딧 부족 체크
    if user.credit < owner_pay:
        raise HTTPException(status_code=400, detail="Insufficient credit")

    # 5. 크레딧 차감
    user.credit -= int(owner_pay)
    db.commit()
    db.refresh(user)

    # 5-1. 프론트에서 위도/경도 전달받아 저장
    detailed_location = order.detailed_location
    lat = order.delivery_lat
    lng = order.delivery_lng

    # 6. Order 생성
    new_order = models.Order(
        creator_id=user.id,
        owner_id=user.id,
        store_id=store.id,
        delivery_location=order.delivery_location,
        detailed_location=detailed_location,
        delivery_lat=lat,
        delivery_lng=lng,
        split_type=order.split_type,
        owner_paid_amount=int(owner_pay),
        created_at=datetime.now(),
        expires_at=datetime.now() + timedelta(minutes=30)
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    asyncio.create_task(start_timeout_task(new_order.id, user.id))

    # 7. OrderItem 생성 (장바구니 → OrderItem)
    order_items = []
    for item in cart_items:
        order_item = models.OrderItem(
            order_id=new_order.id,
            user_id=user.id,
            menu_id=item.menu_id,
            price=item.price
        )
        db.add(order_item)
        order_items.append(order_item)

    # 8. 장바구니 비우기
    for item in cart_items:
        db.delete(item)

    db.commit()

    return {
        "message": "Order created successfully",
        "order_id": new_order.id,
        "store_name": store.name,
        "creator_id": user.id,
        "owner_id": user.id,
        "split_type": new_order.split_type,
        "owner_paid_amount": new_order.owner_paid_amount,
        "items": [
            {"menu_id": i.menu_id, "price": i.price}
            for i in order_items
        ]
    }

@router.get("/")
def get_orders(category: str, lat: float, lon: float, db: Session = Depends(get_db)):

    # 1) 카테고리 맞는 주문(또는 가게) 먼저 조회
    orders = (
        db.query(models.Order)
        .join(models.Store)
        .filter(models.Store.category == category)
        .filter(models.Order.status == "pending")  # pending 상태만 조회
        .all()
    )

    # 2) 거리 필터링
    result = []
    for order in orders:
        store = order.store  # Order -> FK -> Store

        d = distance(lat, lon, store.latitude, store.longitude)

        if d <= 300:   # 300m 이하
            result.append(order)

    return result

@router.get("/{order_id}")
def get_order_detail(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    store = db.query(models.Store).filter(models.Store.id == order.store_id).first()

    # 주문 아이템들 가져오기
    order_items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order_id).all()
    items_with_menu = []
    for item in order_items:
        menu = db.query(models.Menu).filter(models.Menu.id == item.menu_id).first()
        items_with_menu.append({
            "menu_id": item.menu_id,
            "menu_name": menu.name if menu else "Unknown",
            "price": item.price,
            "user_id": item.user_id
        })

    return {
        "id": order.id,
        "creator_id": order.creator_id,
        "owner_id": order.owner_id,
        "store_id": order.store_id,
        "store_name": store.name if store else "Unknown",
        "store_category": store.category if store else "Unknown",
        "delivery_location": order.delivery_location,
        "split_type": order.split_type,
        "owner_paid_amount": order.owner_paid_amount,
        "created_at": order.created_at,
        "expires_at": order.expires_at,
        "status": order.status,
        "items": items_with_menu
    }

@router.delete("/{order_id}")
def delete_order(order_id: int, user_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.creator_id != user_id and order.owner_id != user_id:
        raise HTTPException(status_code=403, detail="No permission to delete")

    # OrderItem 삭제
    items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order.id).all()
    for item in items:
        db.delete(item)

    # 크레딧 환불
    owner = db.query(models.User).filter(models.User.id == order.owner_id).first()
    if owner:
        owner.credit += int(order.owner_paid_amount)
        db.commit()
        db.refresh(owner)

    # Order 상태만 변경 (삭제 대신)
    order.status = "cancelled"
    db.commit()

    return {"message": "Order deleted successfully"}

@router.get("/my/{user_id}")
def get_my_orders(user_id: int, db: Session = Depends(get_db)):
    query = db.query(models.Order).filter(
        ((models.Order.creator_id == user_id) | (models.Order.owner_id == user_id)) &
        (models.Order.status == "pending")
    )
    return query.all()
