from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..routers.notifier import create_notification
from app.schemas import MatchRequest
from .. import crud

router = APIRouter(prefix="/match", tags=["match"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
async def match_order(match_request: MatchRequest = Body(...), db: Session = Depends(get_db)):
    # 1. 주문 매칭 처리
    order, success, reason = crud.match_order(
        db=db,
        order_id=match_request.order_id,
        matched_user_id=match_request.matched_user_id
    )

    if not success:
        # 매칭 실패 알림
        create_notification(
            db=db,
            user_id=match_request.matched_user_id,
            title="매칭 실패",
            message=f"주문 #{match_request.order_id} 매칭에 실패했습니다: {reason}"
        )
        raise HTTPException(status_code=400, detail=reason)

    # 2. 매칭 성공 알림
    # 주문 생성자(owner)에게 알림
    create_notification(
        db=db,
        user_id=order.owner_id,
        title="매칭 성공",
        message=f"주문 #{order.id}이 성공적으로 매칭되었습니다."
    )

    # 매칭 참여자에게 알림
    create_notification(
        db=db,
        user_id=match_request.matched_user_id,
        title="매칭 성공",
        message=f"주문 #{order.id} 매칭에 참여하였습니다."
    )

    return {
        "message": "Order matched successfully",
        "order_id": order.id
    }