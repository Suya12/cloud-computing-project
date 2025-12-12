import os
import requests
from dotenv import load_dotenv

load_dotenv()

KAKAO_REST_API_KEY = os.getenv("KAKAO_API_KEY")

def geocode_address(address: str):
    """
    Kakao REST API를 사용하여 주소를 위도/경도로 변환합니다.

    Args:
        address: 검색할 주소 문자열

    Returns:
        (latitude, longitude) 튜플, 실패 시 (None, None)
    """
    if not KAKAO_REST_API_KEY:
        print("[Geocode Error] KAKAO_API_KEY가 설정되지 않았습니다.")
        return None, None

    url = "https://dapi.kakao.com/v2/local/search/address.json"
    headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
    params = {"query": address}

    try:
        response = requests.get(url, headers=headers, params=params)
        data = response.json()
    except Exception as e:
        print(f"[Geocode Error] API 호출 실패: {e}")
        return None, None

    if response.status_code != 200:
        print(f"[Geocode Error] {address} → HTTP {response.status_code}")
        return None, None

    if "documents" not in data or len(data["documents"]) == 0:
        print(f"[Geocode Warning] 주소를 찾을 수 없음: {address}")
        return None, None

    loc = data["documents"][0]
    lat = float(loc["y"])
    lng = float(loc["x"])

    return lat, lng