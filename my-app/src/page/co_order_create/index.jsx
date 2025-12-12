import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { storesAPI, cartAPI, ordersAPI } from '../../api';
import './style.css';

export default function Co_order_create() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const storeId = searchParams.get('store_id');
    const category = searchParams.get('category');
    const { user } = useAuth();

    // 데이터 상태
    const [store, setStore] = useState(null);
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cartItems, setCartItems] = useState([]);

    // 폼 상태
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState(null);
    const [lng, setLng] = useState(null);
    const [eatType, setEatType] = useState('share');
    const [selectedMenus, setSelectedMenus] = useState([]);

    // 지도 관련 ref
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const geocoderRef = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    // 장바구니 조회
    const fetchCart = async () => {
        if (!user?.id) return;
        try {
            const res = await cartAPI.getCart(user.id);
            setCartItems(res.data || []);
        } catch (err) {
            console.error('장바구니 조회 실패:', err);
        }
    };

    // 사용자 주소 기본값 설정
    useEffect(() => {
        if (user?.address) {
            setAddress(user.address);
        }
        if (user?.latitude && user?.longitude) {
            setLat(user.latitude);
            setLng(user.longitude);
        }
    }, [user]);

    // 가게/메뉴 데이터 로드
    useEffect(() => {
        const loadData = async () => {
            if (!storeId) {
                setLoading(false);
                return;
            }
            try {
                const [storeRes, menuRes] = await Promise.all([
                    storesAPI.getStoreById(storeId),
                    storesAPI.getMenus(storeId)
                ]);
                setStore(storeRes.data[0]);
                setMenus(menuRes.data || []);
                await fetchCart();
            } catch (err) {
                console.error('데이터 로드 실패:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [storeId, user]);

    // 카카오맵 초기화
    useEffect(() => {
        if (loading) return;
        if (!mapContainerRef.current) return;
        if (mapInstanceRef.current) return; // 이미 초기화됨

        const initializeMap = () => {
            try {
                const container = mapContainerRef.current;
                if (!container) {
                    console.error('지도 컨테이너를 찾을 수 없습니다.');
                    return false;
                }

                // Map 생성자가 있는지 확인
                if (!window.kakao?.maps?.Map) {
                    return false;
                }

                // 사용자 저장 좌표가 있으면 그 위치로, 없으면 전주시 기본값
                const centerLat = user?.latitude || 35.8468;
                const centerLng = user?.longitude || 127.1297;

                const options = {
                    center: new window.kakao.maps.LatLng(centerLat, centerLng),
                    level: 3
                };

                const map = new window.kakao.maps.Map(container, options);
                mapInstanceRef.current = map;

                // Geocoder 초기화
                geocoderRef.current = new window.kakao.maps.services.Geocoder();

                // 사용자 저장 위치가 있으면 마커 표시
                if (user?.latitude && user?.longitude) {
                    const position = new window.kakao.maps.LatLng(user.latitude, user.longitude);
                    const marker = new window.kakao.maps.Marker({ position });
                    marker.setMap(map);
                    markerRef.current = marker;
                }

                // 지도 클릭 이벤트
                window.kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
                    const latlng = mouseEvent.latLng;
                    placeMarker(latlng.getLat(), latlng.getLng());

                    // 좌표 -> 주소 변환
                    geocoderRef.current.coord2Address(
                        latlng.getLng(),
                        latlng.getLat(),
                        (result, status) => {
                            if (status === window.kakao.maps.services.Status.OK) {
                                setAddress(result[0].address.address_name);
                            }
                        }
                    );
                });

                setMapLoaded(true);
                return true;
            } catch (err) {
                console.error('카카오맵 초기화 실패:', err);
                return false;
            }
        };

        // SDK가 완전히 로드될 때까지 폴링
        let attempts = 0;
        const maxAttempts = 50; // 최대 5초 대기

        const pollForKakaoMaps = () => {
            attempts++;

            // kakao.maps.Map이 존재하면 초기화 시도
            if (window.kakao?.maps?.Map) {
                if (initializeMap()) {
                    return; // 성공
                }
            }

            // kakao.maps.load 함수가 있으면 호출 시도
            if (window.kakao?.maps?.load && typeof window.kakao.maps.load === 'function') {
                try {
                    window.kakao.maps.load(() => {
                        if (!mapInstanceRef.current) {
                            initializeMap();
                        }
                    });
                } catch (e) {
                    // load 이미 호출됨, 무시
                }
            }

            // 최대 시도 횟수 미만이면 계속 폴링
            if (attempts < maxAttempts && !mapInstanceRef.current) {
                setTimeout(pollForKakaoMaps, 100);
            } else if (attempts >= maxAttempts && !mapInstanceRef.current) {
                console.error('카카오맵 SDK 로딩 타임아웃');
            }
        };

        // 100ms 후 폴링 시작
        const timer = setTimeout(pollForKakaoMaps, 100);
        return () => clearTimeout(timer);
    }, [loading]);

    // 마커 배치 함수
    const placeMarker = (latitude, longitude) => {
        if (!mapInstanceRef.current) return;

        const position = new window.kakao.maps.LatLng(latitude, longitude);

        // 기존 마커 제거
        if (markerRef.current) {
            markerRef.current.setMap(null);
        }

        // 새 마커 생성
        const marker = new window.kakao.maps.Marker({ position });
        marker.setMap(mapInstanceRef.current);
        markerRef.current = marker;

        // 지도 중심 이동
        mapInstanceRef.current.setCenter(position);

        // 좌표 저장
        setLat(latitude);
        setLng(longitude);
    };

    // 주소 검색
    const handleSearch = () => {
        if (!address.trim()) {
            alert('주소를 입력해주세요.');
            return;
        }
        if (!mapLoaded || !geocoderRef.current) {
            alert('지도가 로드되지 않았습니다.');
            return;
        }

        // 주소 검색 시도
        geocoderRef.current.addressSearch(address, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const y = parseFloat(result[0].y);
                const x = parseFloat(result[0].x);
                placeMarker(y, x);
                setAddress(result[0].address_name);
            } else {
                alert('검색 결과가 없습니다. 정확한 주소를 입력해주세요.');
            }
        });
    };

    // 메뉴 토글
    const handleMenuToggle = (menuId) => {
        if (cartItems.some(item => item.menu_id === menuId)) return;
        setSelectedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    // 장바구니에서 삭제
    const handleRemoveFromCart = async (menuId) => {
        try {
            await cartAPI.removeItem(user.id, menuId);
            await fetchCart();
        } catch (err) {
            console.error('삭제 실패:', err);
            alert('삭제에 실패했습니다.');
        }
    };

    // 주문 생성
    const handleCreateOrder = async () => {
        if (!address.trim()) {
            alert('배달 위치를 입력해주세요.');
            return;
        }
        if (lat === null || lng === null) {
            alert('지도에서 위치를 선택하거나 주소를 검색해주세요.');
            return;
        }
        if (selectedMenus.length === 0 && cartItems.length === 0) {
            alert('메뉴를 선택해주세요.');
            return;
        }

        try {
            // 선택한 메뉴 장바구니에 추가
            for (const menuId of selectedMenus) {
                await cartAPI.addItem(user.id, storeId, menuId);
            }

            // 주문 생성
            const splitType = eatType === 'share';
            const res = await ordersAPI.createOrder(user.id, address, splitType, lat, lng);

            setCartItems([]);
            setSelectedMenus([]);

            alert('공동 주문이 생성되었습니다!');
            navigate(`/deliver_process?order_id=${res.data.order_id}`);
        } catch (err) {
            console.error('주문 생성 실패:', err);
            alert(err.response?.data?.detail || '주문 생성에 실패했습니다.');
        }
    };

    if (loading) {
        return <div className="order-box">로딩 중...</div>;
    }

    if (!store) {
        return <div className="order-box">가게 정보를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="order-box">
            <div className="header-row">
                <span className="back-btn" onClick={() => navigate(-1)}>&lt;</span>
                <h2 className="title">공동 주문 생성</h2>
            </div>

            {/* 가게 정보 */}
            <div className="info-box">
                <div className="row">
                    <span>가게</span>
                    <span>{store.name}</span>
                </div>
                <div className="row">
                    <span>카테고리</span>
                    <span>{category || store.category}</span>
                </div>
                <div className="row">
                    <span>최소주문</span>
                    <span>{store.minimum_price?.toLocaleString()}원</span>
                </div>
                <div className="row">
                    <span>배달팁</span>
                    <span>{store.delivery_tip?.toLocaleString()}원</span>
                </div>
            </div>

            {/* 배달 위치 */}
            <label className="label">배달 받을 위치</label>
            <div
                ref={mapContainerRef}
                id="map"
                className="map-container"
                style={{ width: '100%', height: '200px' }}
            />
            <div className="address-search-row">
                <input
                    type="text"
                    className="input-field address-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="주소 입력 후 검색 또는 지도 클릭"
                />
                <button
                    type="button"
                    className="search-btn"
                    onClick={handleSearch}
                    disabled={!mapLoaded}
                >
                    {mapLoaded ? '검색' : '로딩...'}
                </button>
            </div>

            {/* 먹기 방식 */}
            <label className="label">함께 먹기 방식</label>
            <div className="radio-group">
                <label>
                    <input
                        type="radio"
                        name="eatType"
                        checked={eatType === 'share'}
                        onChange={() => setEatType('share')}
                    /> 나눠먹기
                </label>
                <label>
                    <input
                        type="radio"
                        name="eatType"
                        checked={eatType === 'individual'}
                        onChange={() => setEatType('individual')}
                    /> 각자 먹기
                </label>
            </div>

            {/* 현재 장바구니 */}
            {cartItems.length > 0 && (
                <>
                    <label className="label">현재 장바구니</label>
                    <div className="cart-list">
                        {cartItems.map(item => (
                            <div key={item.menu_id} className="cart-item">
                                <div>
                                    <div className="menu-name">{item.menu_name}</div>
                                    <div className="menu-price">{item.price?.toLocaleString()}원</div>
                                </div>
                                <button
                                    className="delete-btn"
                                    onClick={() => handleRemoveFromCart(item.menu_id)}
                                >
                                    삭제
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* 메뉴 선택 */}
            <label className="label">메뉴 추가 선택</label>
            <div className="menu-list">
                {menus.length > 0 ? (
                    menus.map(menu => {
                        const inCart = cartItems.some(item => item.menu_id === menu.id);
                        return (
                            <div key={menu.id} className={`menu-item ${inCart ? 'in-cart' : ''}`}>
                                <div>
                                    <div className="menu-name">
                                        {menu.name}
                                        {inCart && <span className="in-cart-badge">장바구니</span>}
                                    </div>
                                    <div className="menu-price">{menu.price?.toLocaleString()}원</div>
                                </div>
                                <input
                                    type="checkbox"
                                    className="menu-check"
                                    checked={selectedMenus.includes(menu.id)}
                                    onChange={() => handleMenuToggle(menu.id)}
                                    disabled={inCart}
                                />
                            </div>
                        );
                    })
                ) : (
                    <p>메뉴가 없습니다.</p>
                )}
            </div>

            <button className="submit-btn" onClick={handleCreateOrder}>
                공동 주문 생성하기
            </button>
        </div>
    );
}
