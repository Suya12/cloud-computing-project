import math

def distance(lat1, lon1, lat2, lon2):
    """
    두 좌표 사이의 거리를 계산합니다 (Haversine 공식).
    좌표 값이 None이면 무한대를 반환합니다.
    """
    # None 값 체크 - 좌표가 없으면 무한대 반환 (필터링에서 제외됨)
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')

    R = 6371000  # m
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)

    a = math.sin(dLat / 2)**2 + math.cos(math.radians(lat1)) \
        * math.cos(math.radians(lat2)) * math.sin(dLon / 2)**2

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c
