import os
import requests

KAKAO_API_KEY = os.getenv("KAKAO_API_KEY")

def geocode_address(address: str):
    url = "https://dapi.kakao.com/v2/local/search/address.json"

    headers = {
        "Authorization": f"KakaoAK {KAKAO_API_KEY}"
    }

    params = {
        "query": address
    }

    response = requests.get(url, headers=headers, params=params)
    data = response.json()

    # 검색 실패 또는 결과 없음
    if "documents" not in data or len(data["documents"]) == 0:
        return None, None

    loc = data["documents"][0]

    # 카카오는 x=경도(longitude), y=위도(latitude)
    lat = float(loc["y"])
    lng = float(loc["x"])

    return lat, lng
