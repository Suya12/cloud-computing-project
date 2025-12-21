from fastapi import FastAPI
from .database import Base, engine
from .routers import orders, users, match, google_auth, stores, cart, notifier
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

app = FastAPI(title="Joint Order Service")

# DB 테이블 생성
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 모든 도메인 허용(개발 환경이면 이걸로 OK)
    allow_credentials=True,
    allow_methods=["*"],   # 모든 메서드 허용 (GET, POST, ...)
    allow_headers=["*"],   # 모든 헤더 허용
)

# 라우터 등록
app.include_router(users.router)
app.include_router(stores.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(match.router)
app.include_router(google_auth.router)
app.include_router(notifier.router)


@app.on_event("startup")
async def startup_event():
    print("Joint Order Service 서버 시작")
    print("WebSocket: /ws/user/{user_id}")

@app.get("/health")
def health():
    return {"status": "ok"}
