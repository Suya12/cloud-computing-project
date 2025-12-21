from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Float
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

seoul_tz = ZoneInfo("Asia/Seoul")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    credit = Column(Integer, default=0)

    address = Column(String, nullable=True)  # 기존: 사용자가 입력한 주소(텍스트)
    detailed_address = Column(String, nullable=True)  # 추가: 상세 주소
    latitude = Column(Float, nullable=True)  # 추가
    longitude = Column(Float, nullable=True) # 추가

    orders = relationship("Order", back_populates="owner", foreign_keys="Order.owner_id")
    created_orders = relationship("Order", back_populates="creator", foreign_keys="Order.creator_id")
    menu_list = relationship("MenuList", back_populates="user")
    order_items = relationship("OrderItem", back_populates="user")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    creator_id = Column(Integer, ForeignKey("users.id"))
    store_id = Column(Integer, ForeignKey("stores.id"))

    delivery_location = Column(String, nullable=False)  # 예: 사용자가 입력한 주소 문자열
    detailed_location = Column(String, nullable=True)  # 예: "101동 202호"
    delivery_lat = Column(Float, nullable=True)    # 추가
    delivery_lng = Column(Float, nullable=True)   # 추가

    split_type = Column(Boolean, nullable=False)
    owner_paid_amount = Column(Integer, nullable=False)

    created_at = Column(DateTime, default=datetime.now(seoul_tz))
    expires_at = Column(DateTime, default=lambda: datetime.now(seoul_tz) + timedelta(minutes=30))

    status = Column(String, default="pending") # 주문 상태: pending, matched, completed, cancelled 등

    store = relationship("Store", back_populates="orders")
    owner = relationship("User", back_populates="orders", foreign_keys=[owner_id])
    creator = relationship("User", back_populates="created_orders", foreign_keys=[creator_id])

    items = relationship("OrderItem", back_populates="order", cascade="all, delete")

class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=True)

    location = Column(String, nullable=True)  # 기존: 주소 문자열
    latitude = Column(Float, nullable=True)   # 추가
    longitude = Column(Float, nullable=True)  # 추가

    minimum_price = Column(Integer, nullable=False)
    delivery_tip = Column(Integer, nullable=False)
    delivery_delay = Column(Integer, nullable=False)  # 예상 배달 시간(분)

    menus = relationship("Menu", back_populates="store")
    orders = relationship("Order", back_populates="store")

class Menu(Base):
    __tablename__ = "menu"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name = Column(String, nullable=False)
    price = Column(Integer, nullable=False)

    store = relationship("Store", back_populates="menus")
    menu_list = relationship("MenuList", back_populates="menu")
    order_items = relationship("OrderItem", back_populates="menu")

class MenuList(Base):
    __tablename__ = "menu_list"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    menu_id = Column(Integer, ForeignKey("menu.id"), primary_key=True)
    price = Column(Integer, nullable=False)

    user = relationship("User", back_populates="menu_list")
    menu = relationship("Menu", back_populates="menu_list")

class OrderItem(Base):
    __tablename__ = "order_items"

    order_id = Column(Integer, ForeignKey("orders.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    menu_id = Column(Integer, ForeignKey("menu.id"), primary_key=True)
    price = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="items")
    user = relationship("User", back_populates="order_items")
    menu = relationship("Menu", back_populates="order_items")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now(seoul_tz))
