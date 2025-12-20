# auth/google_auth.py

import requests    # 구글 api 호출
from fastapi import APIRouter, HTTPException, Depends 
from fastapi.responses import RedirectResponse
from .users import find_user_by_email, create_user_record
from ..utils.jwt_utils import create_jwt
from sqlalchemy.orm import Session
from ..database import SessionLocal

# 프론트엔드 -> 구글에서 로그인 -> 코드 받아서 백엔드에서 처리?


## aws에서 실행 할 예정 -> 주소부분은 바꿀수 있음 테스트는 해보긴 해야함


router = APIRouter(prefix="/auth/google")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

GOOGLE_CLIENT_ID = "51211712016-n6hn3hjv9dhl9ljptfp17ihq1slalfq9.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "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"

# 로그인 완료 후 구글이 백엔드로 보내는 URL     --> 유비콘으로 실행 시 127.0.0.1:8000 
REDIRECT_URI = "http://delivery-1536434919.us-east-1.elb.amazonaws.com/auth/google/callback"

# 로그인 성공 후 JWT를 가지고 프론트로 보내줄 URL (React Vite 개발서버)
FRONT_REDIRECT = "https://d23dn2tm74qiqa.cloudfront.net/category"
FRONT_LOGIN = "https://d23dn2tm74qiqa.cloudfront.net/login"


@router.get("/login")   
def google_login():
    google_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        "?response_type=code"
        f"&client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        "&scope=openid%20email%20profile"      # 클라이언트는 여기 url타고 구글에서 로그인
    )
    return {"login_url": google_url}


@router.get("/callback")
def google_callback(code: str = None, error: str = None, db: Session = Depends(get_db)):
    # 사용자가 로그인을 취소한 경우
    if error:
        return RedirectResponse(f"{FRONT_LOGIN}?error={error}")

    if not code:
        return RedirectResponse(f"{FRONT_LOGIN}?error=no_code")

    # 구글에서 code 를 보냄 로그인 성공 시에
    # access token 요청
    token_url = "https://oauth2.googleapis.com/token" # 토큰 요청 주소
    token_data = {            # 받을 토큰 데이터들
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    token_res = requests.post(token_url, data=token_data)   # 구글에 POST 요청 후 토큰을 받음 / 파라미터로 토큰 url , 토큰 데이터

    if token_res.status_code != 200:   # 실패시 에러반환  요청 성공 200 / 실패 400~500
        raise HTTPException(status_code=400, detail="Failed to fetch token")

    token_json = token_res.json()   # 토큰 정보를 json으로 변환
    id_token = token_json.get("id_token")

    # 구글 id_token으로 사용자 정보 요청  -> json으로 받음
    user_info_res = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}")
    user_info = user_info_res.json()

    email = user_info["email"]
    name = user_info.get("name", "")



    # DB 저장 또는 기존 유저 불러오기  -> 실직적으로 DB 따로 구현
    user = find_user_by_email(db, email)
    if not user:
        user = create_user_record(db, email, name)

    # JWT 만들기
    jwt_token = create_jwt(user)

    # 프론트로 리다이렉션
    redirect_url = f"{FRONT_REDIRECT}?token={jwt_token}"
    return RedirectResponse(redirect_url)