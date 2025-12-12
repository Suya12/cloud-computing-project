from .database import SessionLocal
from app import models
from sqlalchemy.orm import Session
from app.utils.geocode import geocode_address  # 위에서 만든 함수 import
from . import database

engine = database.engine
models.Base.metadata.create_all(bind=engine)

# 1) 상점 데이터 (이름, 카테고리, 주소, 최소금액, 배달팁)
STORE_DATA = [
    ("BHC", "치킨", "전북 전주시 덕진구 송천동1가 97-6", 18000, 2000),
    ("bbq", "치킨", "전북 전주시 완산구 서신동 800", 18000, 3500),
    ("네네치킨", "치킨", "전북 전주시 완산구 효자동1가 660-1", 23000, 3000),
    ("도미노피자", "피자", "전북 전주시 덕진구 인후동1가 912-3", 22000, 5000),
    ("피자헛", "피자", "전북 전주시 덕진구 송천동1가 107-202", 22000, 2000),
    ("고피자", "피자", "전북 전주시 덕진구 덕진동1가 664-6", 14000, 1500),
    ("치쿠린", "일식", "전북 전주시 덕진구 명륜3길 9-1", 15000, 1000),
    ("하나요리당고", "일식", "전북 전주시 덕진구 덕진동1가 664-6", 20000, 3700),
    ("치히로", "일식", "전북 전주시 덕진구 금암동 664-48", 15000, 3000),
    ("홍콩반점", "중식", "전북 전주시 덕진구 덕진광장로 10", 12000, 4000),
    ("미미마라", "중식", "전북 전주시 덕진구 덕진동1가 1312-59", 15000, 3500),
    ("덕일관", "중식", "전북 전주시 덕진구 권삼득로 321-1", 20000, 2000),
    ("한그릇짓", "한식", "전북 전주시 덕진구 덕진광장로 6", 11000, 2500),
    ("교반", "한식", "전북 전주시 덕진구 권삼득로 329", 11000, 3300),
    ("이문형감자탕", "한식", "전북 전주시 덕진구 명륜2길 16-5", 14000, 4000),
]


# 2) 메뉴 데이터
MENU_DATA = {
    "BHC": [
        ("후라이드치킨", 20000),
        ("뿌링클", 22000),
        ("핫후라이드", 21000),
    ],
    "bbq": [
        ("황금올리브", 23000),
        ("양념치킨", 24000),
        ("뿜치킹", 24000),
    ],
    "네네치킨": [
        ("후라이드치킨", 20000),
        ("스노윙치킨", 25000),
        ("소이갈릭치킨", 25000),
    ],
    "도미노피자": [
        ("리얼불고기", 30000),
        ("포테이토", 28000),
        ("랍스터쉬림프", 34000),
    ],
    "피자헛": [
        ("페퍼로니", 29000),
        ("콤비네이션", 29000),
        ("치즈", 25000),
    ],
    "고피자": [
        ("고르곤졸라", 12000),
        ("고구마", 13000),
        ("반반", 14000),
    ],
    "치쿠린": [
        ("쇼유라멘", 12000),
        ("시오라멘", 12000),
        ("가츠동", 13000),
    ],
    "하나요리당고": [
        ("카레", 13000),
        ("규동", 12000),
        ("에비동", 11000),
    ],
    "치히로": [
        ("텐동", 13000),
        ("사케동", 15000),
        ("우니동", 35000),
    ],
    "홍콩반점": [
        ("짜장면", 7000),
        ("짬뽕", 9000),
        ("탕수육", 18000),
    ],
    "미미마라": [
        ("마라탕", 11000),
        ("마라샹궈", 15000),
        ("크림새우", 12000),
    ],
    "덕일관": [
        ("볶음밥", 9000),
        ("우동", 9000),
        ("잡채밥", 11000),
    ],
    "한그릇짓": [
        ("한식포케한그릇", 11000),
        ("아는맛보다조금더맛있는비빔밥", 9000),
        ("돼지불고기한그릇", 12000),
    ],
    "교반": [
        ("쭈삼비빔밥", 11000),
        ("우삼겹비빔밥", 11000),
        ("꼬막비빔밥", 11000),
    ],
    "이문형감자탕": [
        ("뼈뚝배기", 12000),
        ("뼈전골", 30000),
        ("라면사리추가", 2000),
    ],
}

# 3) 더미 데이터 생성
def create_dummy_data():
    db: Session = SessionLocal()

    try:
        store_objects = []

        # ① 상점 생성 + geocode
        print("=== 상점 데이터 생성 시작 ===")
        for name, category, location, minimum_price, delivery_tip in STORE_DATA:
            lat, lng = geocode_address(location)

            store = models.Store(
                name=name,
                category=category,
                location=location,
                minimum_price=minimum_price,
                delivery_tip=delivery_tip,
                delivery_delay=30,
                latitude=lat,
                longitude=lng
            )

            store_objects.append(store)
            print(f"  - {name}: ({lat}, {lng})")

        db.add_all(store_objects)
        db.commit()
        print(f"=== 상점 {len(store_objects)}개 생성 완료 ===\n")

        # ② 메뉴 생성
        print("=== 메뉴 데이터 생성 시작 ===")
        menu_objects = []
        for store in store_objects:
            if store.name in MENU_DATA:
                for menu_name, price in MENU_DATA[store.name]:
                    menu_objects.append(
                        models.Menu(
                            store_id=store.id,
                            name=menu_name,
                            price=price
                        )
                    )

        db.add_all(menu_objects)
        db.commit()
        print(f"=== 메뉴 {len(menu_objects)}개 생성 완료 ===")

    finally:
        db.close()

if __name__ == "__main__":
    create_dummy_data()