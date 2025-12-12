import asyncio
from datetime import datetime
from ..database import SessionLocal
from .. import models
from ..routers.notifier import create_notification
from zoneinfo import ZoneInfo

seoul_tz = ZoneInfo("Asia/Seoul")

async def start_timeout_task(order_id: int, user_id: int, delay_minutes: int = 30):
    await asyncio.sleep(delay_minutes * 60)

    db = SessionLocal()
    try:
        order = db.query(models.Order).filter(
            models.Order.id == order_id
        ).first()

        if not order:
            return  # 주문이 아예 없음 → 아무것도 할 필요 없음

        # 현재 시간
        now = datetime.now(seoul_tz)

        # 이미 만료되었는지 확인
        if now < order.expires_at:
            return  # 시간 내에 매칭이 되어 만료가 연기되었거나 정상적으로 처리된 경우

        # Order가 expire 시간까지 매칭되지 않은 경우 → 자동 취소 처리
        message = f"요청 #{order_id}이 30분 동안 매칭되지 않아 자동 취소되었습니다."

        # 주문 삭제
        db.delete(order)
        db.commit()

        print(f"[타임아웃] {now} → {message}")

        # Polling용 알림 추가
        create_notification(
            db=db,
            user_id=user_id,
            title="매칭 실패",
            message=message
        )

    except Exception as e:
        print(f"[Scheduler Error] {e}")
    finally:
        db.close()