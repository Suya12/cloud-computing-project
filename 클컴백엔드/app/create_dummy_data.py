from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal, engine

# DB 초기화 (테이블 없으면 생성)
models.Base.metadata.create_all(bind=engine)

def create_dummy_data():
    db: Session = SessionLocal()
    try:
        # 예시: 가게 추가
        store1 = models.Store(name="BHC", category="치킨", location="전주시 덕진구", minimum_price=18000, delivery_tip=2000, delivery_delay=30)
        store2 = models.Store(name="bbq", category="치킨", location="전주시 덕진구", minimum_price=18000, delivery_tip=3500, delivery_delay=30)
        store3 = models.Store(name="네네치킨", category="치킨", location="전주시 덕진구", minimum_price=23000, delivery_tip=3000, delivery_delay=30)
        store4 = models.Store(name="도미노피자", category="피자", location="전주시 덕진구", minimum_price=22000, delivery_tip=5000, delivery_delay=30)
        store5 = models.Store(name="피자헛", category="피자", location="전주시 덕진구", minimum_price=22000, delivery_tip=2000, delivery_delay=30)
        store6 = models.Store(name="고피자", category="피자", location="전주시 덕진구", minimum_price=14000, delivery_tip=1500, delivery_delay=30)
        store7 = models.Store(name="치쿠린", category="일식", location="전주시 덕진구", minimum_price=15000, delivery_tip=1000, delivery_delay=30)
        store8 = models.Store(name="하나요리당고", category="일식", location="전주시 덕진구", minimum_price=20000, delivery_tip=3700, delivery_delay=30)
        store9 = models.Store(name="치히로", category="일식", location="전주시 덕진구", minimum_price=15000, delivery_tip=3000, delivery_delay=30)
        store10 = models.Store(name="홍콩반점", category="중식", location="전주시 덕진구", minimum_price=12000, delivery_tip=4000, delivery_delay=30)
        store11 = models.Store(name="미미마라", category="중식", location="전주시 덕진구", minimum_price=15000, delivery_tip=3500, delivery_delay=30)
        store12 = models.Store(name="덕일관", category="중식", location="전주시 덕진구", minimum_price=20000, delivery_tip=2000, delivery_delay=30)
        store13 = models.Store(name="한그릇짓", category="한식", location="전주시 덕진구", minimum_price=11000, delivery_tip=2500, delivery_delay=30)
        store14 = models.Store(name="교반", category="한식", location="전주시 덕진구", minimum_price=11000, delivery_tip=3300, delivery_delay=30)
        store15 = models.Store(name="이문형감자탕", category="한식", location="전주시 덕진구", minimum_price=14000, delivery_tip=4000, delivery_delay=30)
        
        db.add_all([store1, store2, store3, store4, store5, store6, store7, store8, store9, store10,
                    store11, store12, store13, store14, store15])
        db.commit()

        # 메뉴 추가
        menu1 = models.Menu(store_id=store1.id, name="후라이드치킨", price=20000)
        menu2 = models.Menu(store_id=store1.id, name="뿌링클", price=22000)
        menu3 = models.Menu(store_id=store1.id, name="핫후라이드", price=21000)
        menu4 = models.Menu(store_id=store2.id, name="황금올리브", price=23000)
        menu5 = models.Menu(store_id=store2.id, name="양념치킨", price=24000)
        menu6 = models.Menu(store_id=store2.id, name="뿜치킹", price=24000)
        menu7 = models.Menu(store_id=store3.id, name="후라이드치킨", price=20000)
        menu8 = models.Menu(store_id=store3.id, name="스노윙치킨", price=25000)
        menu9 = models.Menu(store_id=store3.id, name="소이갈릭치킨", price=25000)
        menu10 = models.Menu(store_id=store4.id, name="리얼불고기", price=30000)
        menu11 = models.Menu(store_id=store4.id, name="포테이토", price=28000)
        menu12 = models.Menu(store_id=store4.id, name="랍스터쉬림프", price=34000)
        menu13 = models.Menu(store_id=store5.id, name="페퍼로니", price=29000)
        menu14 = models.Menu(store_id=store5.id, name="콤비네이션", price=29000)
        menu15 = models.Menu(store_id=store5.id, name="치즈", price=25000)
        menu16 = models.Menu(store_id=store6.id, name="고르곤졸라", price=12000)
        menu17 = models.Menu(store_id=store6.id, name="고구마", price=13000)
        menu18 = models.Menu(store_id=store6.id, name="반반", price=14000)
        menu19 = models.Menu(store_id=store7.id, name="쇼유라멘", price=12000)
        menu20 = models.Menu(store_id=store7.id, name="시오라멘", price=12000)
        menu21 = models.Menu(store_id=store7.id, name="가츠동", price=13000)
        menu22 = models.Menu(store_id=store8.id, name="카레", price=13000)
        menu23 = models.Menu(store_id=store8.id, name="규동", price=12000)
        menu24 = models.Menu(store_id=store8.id, name="에비동", price=11000)
        menu25 = models.Menu(store_id=store9.id, name="텐동", price=13000)
        menu26 = models.Menu(store_id=store9.id, name="사케동", price=15000)
        menu27 = models.Menu(store_id=store9.id, name="우니동", price=35000)
        menu28 = models.Menu(store_id=store10.id, name="짜장면", price=7000)
        menu29 = models.Menu(store_id=store10.id, name="짬뽕", price=9000)
        menu30 = models.Menu(store_id=store10.id, name="탕수육", price=18000)
        menu31 = models.Menu(store_id=store11.id, name="마라탕", price=11000)
        menu32 = models.Menu(store_id=store11.id, name="마라샹궈", price=15000)
        menu33 = models.Menu(store_id=store11.id, name="크림새우", price=12000)
        menu34 = models.Menu(store_id=store12.id, name="볶음밥", price=9000)
        menu35 = models.Menu(store_id=store12.id, name="우동", price=9000)
        menu36 = models.Menu(store_id=store12.id, name="잡채밥", price=11000)
        menu37 = models.Menu(store_id=store13.id, name="한식포케한그릇", price=11000)
        menu38 = models.Menu(store_id=store13.id, name="아는맛보다조금더맛있는비빔밥", price=9000)
        menu39 = models.Menu(store_id=store13.id, name="돼지불고기한그릇", price=12000)
        menu40 = models.Menu(store_id=store14.id, name="쭈삼비빔밥", price=11000)
        menu41 = models.Menu(store_id=store14.id, name="우삼겹비빔밥", price=11000)
        menu42 = models.Menu(store_id=store14.id, name="꼬막비빔밥", price=11000)
        menu43 = models.Menu(store_id=store15.id, name="뼈뚝배기", price=12000)
        menu44 = models.Menu(store_id=store15.id, name="뼈전골", price=30000)
        menu45 = models.Menu(store_id=store15.id, name="라면사리추가", price=2000)

        db.add_all([menu1, menu2, menu3, menu4, menu5, menu6, menu7, menu8, menu9, menu10, menu11, menu12, menu13, menu14, menu15, menu16, menu17, menu18, menu19, menu20,
                    menu21, menu22, menu23, menu24, menu25, menu26, menu27, menu28, menu29, menu30, menu31, menu32, menu33, menu34, menu35, menu36, menu37, menu38, menu39, menu40,
                    menu41, menu42, menu43, menu44, menu45])
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    create_dummy_data()