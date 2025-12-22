# 배달 공동 주문 서비스 (Joint Order Service) 프로젝트 보고서

## 1. 프로젝트 개요

### 1.1 서비스 소개
배달 공동 주문 서비스는 같은 지역의 사용자들이 동일한 음식점에서 함께 주문하여 **배달비를 절감**할 수 있는 플랫폼입니다.

### 1.2 주요 기능
- **공동 주문 생성**: 사용자가 주문을 생성하고 다른 사용자의 참여를 기다림
- **주문 매칭**: 30분 내에 다른 사용자와 매칭되어 배달비 분담
- **2가지 주문 방식**:
  - **나눠먹기**: 동일한 메뉴를 함께 주문하여 금액을 반씩 부담
  - **각자먹기**: 각자 원하는 메뉴를 주문하고 배달비만 분담
- **위치 기반 필터링**: 300m 이내의 주문만 표시

---

## 2. 시스템 아키텍처

### 2.1 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                              사용자                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Amazon CloudFront (CDN)                          │
│                   d23dn2tm74qiqa.cloudfront.net                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│       S3 (프론트엔드)         │    │   Application Load Balancer  │
│     React 정적 파일 호스팅    │    │         (API 라우팅)          │
└──────────────────────────────┘    └──────────────────────────────┘
                                                    │
                                    ┌───────────────┴───────────────┐
                                    ▼                               ▼
                    ┌──────────────────────────┐    ┌──────────────────────────┐
                    │   Private EC2 (AZ-1a)    │    │   Private EC2 (AZ-1b)    │
                    │   FastAPI Backend        │    │   FastAPI Backend        │
                    │   (Auto Scaling Group)   │    │   (Auto Scaling Group)   │
                    └──────────────────────────┘    └──────────────────────────┘
                                    │                               │
                                    └───────────────┬───────────────┘
                                                    ▼
                                    ┌──────────────────────────────┐
                                    │     Amazon RDS (PostgreSQL)   │
                                    │      Private Subnet           │
                                    └──────────────────────────────┘
```

### 2.2 AWS 서비스 구성

| 서비스 | 용도 | 설정 |
|--------|------|------|
| **VPC** | 네트워크 격리 | CIDR: 10.0.0.0/16 |
| **Public Subnet** | ALB, NAT Gateway | 10.0.0.0/20, 10.0.16.0/20 |
| **Private Subnet** | EC2, RDS | AZ-1a, AZ-1b 각각 구성 |
| **EC2** | 백엔드 서버 | Amazon Linux 2023, t2.micro |
| **ALB** | 로드 밸런싱 | Health Check: /health |
| **RDS** | 데이터베이스 | PostgreSQL, db.t3.micro |
| **S3** | 프론트엔드 호스팅 | 정적 웹사이트 호스팅 |
| **CloudFront** | CDN | S3 + ALB Origin |
| **NAT Gateway** | Private 인스턴스 아웃바운드 | Elastic IP 연결 |

### 2.3 네트워크 구성

```
VPC (10.0.0.0/16)
│
├── Public Subnet (us-east-1a): 10.0.0.0/20
│   ├── NAT Gateway
│   └── ALB
│
├── Public Subnet (us-east-1b): 10.0.16.0/20
│   └── ALB
│
├── Private Subnet (us-east-1a)
│   ├── EC2 Instance (Backend)
│   └── RDS (Primary)
│
└── Private Subnet (us-east-1b)
    └── EC2 Instance (Backend)
```

---

## 3. 기술 스택

### 3.1 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Python | 3.11 | 런타임 |
| FastAPI | 0.115+ | 웹 프레임워크 |
| SQLAlchemy | 2.0+ | ORM |
| PostgreSQL | 15 | 데이터베이스 |
| Uvicorn | 0.34+ | ASGI 서버 |
| PyJWT | 2.10+ | JWT 인증 |
| APScheduler | 3.11+ | 스케줄링 |

### 3.2 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19.2.0 | UI 프레임워크 |
| Vite | 7.2.4 | 빌드 도구 |
| React Router | 7.9.6 | 라우팅 |
| Axios | 1.13.2 | HTTP 클라이언트 |
| Kakao Maps SDK | - | 지도 서비스 |

### 3.3 외부 서비스
| 서비스 | 용도 |
|--------|------|
| Google OAuth 2.0 | 사용자 인증 |
| Kakao Maps API | 주소 검색 및 지도 표시 |
| Kakao Geocoding API | 주소 → 좌표 변환 |

---

## 4. 데이터베이스 설계

### 4.1 ERD (Entity Relationship Diagram)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │    Store     │       │     Menu     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ email        │       │ name         │       │ store_id (FK)│──┐
│ name         │       │ category     │       │ name         │  │
│ credit       │       │ location     │       │ price        │  │
│ address      │       │ latitude     │       └──────────────┘  │
│ latitude     │       │ longitude    │                         │
│ longitude    │       │ minimum_price│◄────────────────────────┘
└──────────────┘       │ delivery_tip │
        │              │ delivery_delay│
        │              └──────────────┘
        │                      │
        ▼                      ▼
┌──────────────┐       ┌──────────────┐
│   MenuList   │       │    Order     │
│  (장바구니)   │       ├──────────────┤
├──────────────┤       │ id (PK)      │
│ user_id (PK) │       │ creator_id   │──┐
│ menu_id (PK) │       │ owner_id     │──┤
│ price        │       │ store_id     │  │
└──────────────┘       │ split_type   │  │
                       │ status       │  │
        ┌──────────────│ expires_at   │  │
        │              └──────────────┘  │
        ▼                      │         │
┌──────────────┐               │         │
│  OrderItem   │◄──────────────┘         │
├──────────────┤                         │
│ order_id (PK)│                         │
│ user_id (PK) │◄────────────────────────┘
│ menu_id (PK) │
│ price        │
└──────────────┘
```

### 4.2 주요 테이블 설명

**User (사용자)**
- 크레딧 기반 결제 시스템 (초기 50,000원)
- 위도/경도 저장으로 위치 기반 서비스 지원

**Order (주문)**
- `split_type`: true(나눠먹기), false(각자먹기)
- `status`: pending → matched → completed / cancelled
- `expires_at`: 30분 타임아웃 관리

**OrderItem (주문 항목)**
- 복합 기본키로 주문별, 사용자별 메뉴 관리
- 매칭 시 참여자의 메뉴도 동일 order_id로 연결

---

## 5. 주요 기능 구현

### 5.1 공동 주문 생성 플로우

```
1. 카테고리 선택
   └─▶ /category 페이지

2. 가게 선택
   └─▶ /store_select?category=치킨

3. 주문 생성
   └─▶ /co_order_create?store_id=1
       ├─ 배달 주소 입력 (카카오맵)
       ├─ 나눠먹기/각자먹기 선택
       └─ 메뉴 선택 (각자먹기만)

4. API 호출
   └─▶ POST /orders/
       ├─ 장바구니 → OrderItem 변환
       ├─ 크레딧 선차감
       └─ 30분 타임아웃 시작

5. 매칭 대기
   └─▶ /deliver_process?order_id=1
       └─ 10초마다 상태 폴링
```

### 5.2 주문 매칭 플로우

```
1. 공동 주문 목록 조회
   └─▶ /co_deliver_list?category=치킨
       └─ 위치 기반 300m 필터링

2. 주문 선택 및 참여
   └─▶ /pay?order_id=1&store_id=1
       └─ 메뉴 선택 (각자먹기만)

3. 매칭 API 호출
   └─▶ POST /match/
       ├─ 최소 주문 금액 검증
       ├─ 크레딧 차감
       ├─ OrderItem 생성
       ├─ Order.status = 'matched'
       └─ 알림 생성

4. 배달 진행
   └─▶ /deliver_process?order_id=1
       └─ 배달 예상 시간 표시
```

### 5.3 금액 계산 로직

**나눠먹기 (split_type = true)**
```python
# 주문 생성자
owner_pay = total_menu_price / 2 + delivery_tip / 2

# 참여자
matcher_pay = owner_pay  # 동일 금액
```

**각자먹기 (split_type = false)**
```python
# 주문 생성자
owner_pay = owner_menu_price + delivery_tip / 2

# 참여자
matcher_pay = matcher_menu_price + delivery_tip / 2
```

### 5.4 위치 기반 필터링

```python
# Haversine 공식을 이용한 거리 계산
def distance(lat1, lon1, lat2, lon2):
    R = 6371000  # 지구 반경 (m)
    # ... 계산 로직
    return distance_in_meters

# 300m 이내 주문만 필터링
if distance(user_lat, user_lon, order_lat, order_lon) <= 300:
    result.append(order)
```

---

## 6. API 명세

### 6.1 인증 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /auth/google/login | Google OAuth 로그인 URL 반환 |
| GET | /auth/google/callback | OAuth 콜백, JWT 발급 |

### 6.2 사용자 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /users/by_email/{email} | 이메일로 사용자 조회 |
| POST | /users/credit/add/{user_id} | 크레딧 충전 |
| GET | /users/credit/get/{user_id} | 크레딧 조회 |
| PUT | /users/{user_id}/address | 배달 주소 저장 |

### 6.3 가게/메뉴 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /stores/?category={category} | 카테고리별 가게 조회 |
| GET | /stores/?store_id={id} | 특정 가게 조회 |
| GET | /stores/{store_id}/menus | 가게 메뉴 조회 |

### 6.4 장바구니 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /cart/add | 장바구니 추가 |
| GET | /cart/{user_id} | 장바구니 조회 |
| DELETE | /cart/remove | 장바구니 삭제 |

### 6.5 주문 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /orders/ | 공동 주문 생성 |
| GET | /orders/?category={cat}&lat={lat}&lon={lon} | 주문 목록 (위치 필터링) |
| GET | /orders/{order_id} | 주문 상세 조회 |
| DELETE | /orders/{order_id} | 주문 취소 |
| GET | /orders/my/{user_id} | 내 주문 목록 |

### 6.6 매칭 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /match/ | 주문 매칭 |

### 6.7 Health Check

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /health | ALB 헬스체크용 |

---

## 7. 보안 구현

### 7.1 인증/인가
- **Google OAuth 2.0**: 소셜 로그인으로 보안성 확보
- **JWT 토큰**: 1시간 유효, Authorization 헤더로 전달
- **환경변수**: 민감 정보는 .env 파일로 분리

### 7.2 네트워크 보안
- **Private Subnet**: EC2, RDS를 Private 서브넷에 배치
- **Security Group**: 필요한 포트만 허용
  - ALB: 80, 443
  - EC2: 8000 (ALB에서만)
  - RDS: 5432 (EC2에서만)
- **NAT Gateway**: Private 인스턴스의 아웃바운드 트래픽만 허용

### 7.3 데이터 보안
- **CORS 설정**: 허용된 Origin만 접근 가능
- **HTTPS**: CloudFront를 통한 SSL/TLS 암호화

---

## 8. 배포 프로세스

### 8.1 백엔드 배포

```bash
# 1. EC2 인스턴스 접속
ssh -i key.pem ec2-user@<bastion-ip>
ssh ec2-user@<private-ip>

# 2. 코드 업데이트
cd cloud-computing-project/클컴백엔드
git pull origin main

# 3. 의존성 설치
source venv/bin/activate
pip install -r requirements.txt

# 4. 서비스 재시작
sudo systemctl restart fastapi
```

### 8.2 프론트엔드 배포

```bash
# 1. 빌드
cd my-app
npm run build

# 2. S3 업로드
aws s3 sync dist/ s3://<bucket-name> --delete

# 3. CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

### 8.3 Systemd 서비스 설정

```ini
# /etc/systemd/system/fastapi.service
[Unit]
Description=FastAPI Server
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/cloud-computing-project/클컴백엔드
ExecStart=/home/ec2-user/cloud-computing-project/클컴백엔드/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 9. 테스트 및 검증

### 9.1 API 테스트

```bash
# Health Check
curl http://<alb-dns>/health
# 응답: {"status": "ok"}

# 가게 조회
curl -L "http://<alb-dns>/stores/?category=치킨"

# 주문 목록 (위치 필터링)
curl -L "http://<alb-dns>/orders/?category=치킨&lat=35.8468&lon=127.1297"
```

### 9.2 주요 시나리오 테스트

| 시나리오 | 예상 결과 | 검증 완료 |
|----------|----------|-----------|
| Google 로그인 | JWT 토큰 발급 | ✅ |
| 주문 생성 | 크레딧 차감, Order 생성 | ✅ |
| 주문 매칭 | 양쪽 크레딧 차감, 상태 변경 | ✅ |
| 30분 타임아웃 | 자동 취소, 크레딧 환불 | ✅ |
| 위치 필터링 | 300m 이내 주문만 표시 | ✅ |
| 내 주문 목록 | 생성/참여 주문 모두 표시 | ✅ |

---

## 10. 향후 개선 사항

### 10.1 기능 개선
- [ ] 실시간 알림 (WebSocket)
- [ ] 푸시 알림 (FCM)
- [ ] 사용자 평가/리뷰 시스템
- [ ] 실시간 배달 추적

### 10.2 인프라 개선
- [ ] Auto Scaling 정책 설정
- [ ] RDS Multi-AZ 구성
- [ ] ElastiCache (Redis) 도입
- [ ] CI/CD 파이프라인 구축

### 10.3 보안 강화
- [ ] WAF 적용
- [ ] Secrets Manager 도입
- [ ] VPC Endpoint 추가

---

## 11. 결론

본 프로젝트는 AWS 클라우드 환경에서 **고가용성**과 **확장성**을 고려한 배달 공동 주문 서비스를 성공적으로 구현하였습니다.

### 주요 성과
1. **3-Tier 아키텍처**: 프론트엔드(S3+CloudFront), 백엔드(EC2+ALB), 데이터베이스(RDS) 분리
2. **보안 설계**: Private Subnet, Security Group, HTTPS 적용
3. **위치 기반 서비스**: 카카오맵 API와 Haversine 공식을 활용한 거리 필터링
4. **소셜 로그인**: Google OAuth 2.0 + JWT 기반 인증
5. **자동화**: Systemd를 통한 서비스 자동 시작, 30분 타임아웃 자동 처리

이 서비스를 통해 사용자들은 배달비 부담을 줄이면서 편리하게 음식을 주문할 수 있습니다.
