import jwt
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

seoul_tz = ZoneInfo("Asia/Seoul")


JWT_SECRET =  "dkananswkduf"  # 아무 문자열 키값 (토큰 암호화 키) -> 실제로는 환경변수를 사용함 이것도 추가로 생각해볼 필요 있음
JWT_ALGO = "HS256"            # 암호화 알고리즘 보편적 HS256


def create_jwt(user):
    payload={
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "exp": datetime.now(seoul_tz) + timedelta(hours=1)  # 토큰 만료시간 넣어서 안전하게 관리 만약 없을 경우 보안 문제
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    return token