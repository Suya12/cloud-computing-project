from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import List

# 주문 생성용 모델
class OrderItemCreate(BaseModel):
    menu_id: int
    price: int

class OrderCreate(BaseModel):
    creator_id: int
    delivery_location: str
    detailed_location: str | None = None
    delivery_lat: float  # 추가
    delivery_lng: float # 추가
    split_type: bool  # true: 나눠먹기, false: 따로먹기
    # minimum_price는 Store 기준으로 서버에서 처리 가능

# 주문 조회용 모델
class OrderItemOut(BaseModel):
    menu_id: int
    price: int

    class Config:
        orm_mode = True

class OrderOut(BaseModel):
    id: int
    owner_id: int
    creator_id: int
    store_id: int
    delivery_location: str
    delivery_lat: float  # 추가
    delivery_lng: float # 추가
    split_type: bool
    owner_paid_amount: int
    items: List[OrderItemOut]
    created_at: datetime
    expires_at: datetime

    class Config:
        orm_mode = True

# 사용자 모델
class UserCreate(BaseModel):
    id: str
    pwd: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str | None = None
    credit: int
    latitude: float | None = None
    longitude: float | None = None

    class Config:
        orm_mode = True

# 주문 매칭 모델
class MatchRequest(BaseModel):
    order_id: int
    matched_user_id: int

# 구글 로그인 모델
class UserGoogleLogin(BaseModel):
    email: EmailStr
    name: str
    google_id: str
    fcm_token: str | None = None

# 장바구니 모델
class CartItemCreate(BaseModel):
    menu_id: int
