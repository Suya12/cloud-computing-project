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

    const [store, setStore] = useState(null);
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cartItems, setCartItems] = useState([]);

    const [address, setAddress] = useState('');
    const [lat, setLat] = useState(null);
    const [lng, setLng] = useState(null);
    const [eatType, setEatType] = useState('share');
    const [selectedMenus, setSelectedMenus] = useState([]);

    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const geocoderRef = useRef(null);
    const placesRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);

    // 장바구니 조회 함수
    const fetchCart = async () => {
        if (user?.id) {
            try {
                const cartRes = await cartAPI.getCart(user.id);
                setCartItems(cartRes.data || []);
            } catch (error) {
                console.error('Failed to fetch cart:', error);
            }
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!storeId) {
                setLoading(false);
                return;
            }
            try {
                // 가게 정보 가져오기
                const storeRes = await storesAPI.getStoreById(storeId);
                setStore(storeRes.data[0]);

                // 메뉴 가져오기
                const menuRes = await storesAPI.getMenus(storeId);
                setMenus(menuRes.data);

                // 장바구니 가져오기
                await fetchCart();
            } catch (error) {
                console.error('Failed to fetch store data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [storeId, user]);

    // 카카오맵 초기화
    useEffect(() => {
        if (loading) return;

        const initMap = () => {
            const container = document.getElementById('map');
            if (!container) return;

            const options = {
                center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청
                level: 3
            };
            const map = new window.kakao.maps.Map(container, options);
            mapRef.current = map;

            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoderRef.current = geocoder;

            const places = new window.kakao.maps.services.Places();
            placesRef.current = places;

            setMapReady(true);

            // 지도 클릭 이벤트
            window.kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
                const latlng = mouseEvent.latLng;

                // 기존 마커 제거
                if (markerRef.current) {
                    markerRef.current.setMap(null);
                }

                // 새 마커 생성
                const marker = new window.kakao.maps.Marker({
                    position: latlng
                });
                marker.setMap(map);
                markerRef.current = marker;

                // 좌표 저장
                setLat(latlng.getLat());
                setLng(latlng.getLng());

                // 좌표 → 주소 변환
                geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result, status) => {
                    if (status === window.kakao.maps.services.Status.OK) {
                        const addr = result[0].address.address_name;
                        setAddress(addr);
                    }
                });
            });
        };

        // 카카오맵 SDK 로드 확인
        if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(initMap);
        }
    }, [loading]);

    const handleMenuToggle = (menuId) => {
        // 이미 장바구니에 있는 메뉴는 선택 불가
        if (cartItems.some(item => item.menu_id === menuId)) {
            return;
        }
        setSelectedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const handleRemoveFromCart = async (menuId) => {
        try {
            await cartAPI.removeItem(user.id, menuId);
            await fetchCart();
        } catch (error) {
            console.error('Failed to remove item:', error);
            alert('장바구니에서 삭제하는데 실패했습니다.');
        }
    };

    const handleCreateOrder = async () => {
        if (!address.trim()) {
            alert('배달 받을 위치를 입력해주세요.');
            return;
        }

        // 장바구니에 있거나 새로 선택한 메뉴가 없으면 에러
        if (selectedMenus.length === 0 && cartItems.length === 0) {
            alert('최소 1개 이상의 메뉴를 선택해주세요.');
            return;
        }

        try {
            // 1. 장바구니에 선택한 메뉴 추가
            for (const menuId of selectedMenus) {
                await cartAPI.addItem(user.id, storeId, menuId);
            }

            // 2. 주문 생성 (백엔드에서 장바구니 비움)
            const splitType = eatType === 'share';
            const response = await ordersAPI.createOrder(user.id, address, splitType, lat, lng);

            // 3. 프론트엔드 상태 초기화
            setCartItems([]);
            setSelectedMenus([]);

            alert('공동 주문이 생성되었습니다!');
            navigate(`/deliver_process?order_id=${response.data.order_id}`);
        } catch (error) {
            console.error('Failed to create order:', error);
            alert(error.response?.data?.detail || '주문 생성에 실패했습니다.');
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    // 마커 설정 및 지도 이동 헬퍼 함수
    const setMarkerAndMove = (lat, lng, addressName) => {
        const coords = new window.kakao.maps.LatLng(lat, lng);

        // 기존 마커 제거
        if (markerRef.current) {
            markerRef.current.setMap(null);
        }

        // 새 마커 생성
        const marker = new window.kakao.maps.Marker({
            position: coords
        });
        marker.setMap(mapRef.current);
        markerRef.current = marker;

        // 지도 중심 이동
        mapRef.current.setCenter(coords);

        // 좌표 저장
        setLat(lat);
        setLng(lng);

        // 주소 업데이트
        setAddress(addressName);
    };

    // 주소/장소 검색 함수
    const handleAddressSearch = () => {
        if (!address.trim()) {
            alert('검색할 주소 또는 장소명을 입력해주세요.');
            return;
        }

        if (!mapReady || !geocoderRef.current || !mapRef.current || !placesRef.current) {
            alert('지도가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        // 1. 먼저 주소 검색 시도
        geocoderRef.current.addressSearch(address, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
                // 주소 검색 성공
                setMarkerAndMove(
                    parseFloat(result[0].y),
                    parseFloat(result[0].x),
                    result[0].address_name
                );
            } else {
                // 2. 주소 검색 실패 시 장소명 검색 시도
                placesRef.current.keywordSearch(address, (placeResult, placeStatus) => {
                    if (placeStatus === window.kakao.maps.services.Status.OK && placeResult.length > 0) {
                        // 장소 검색 성공 - 첫 번째 결과 사용
                        const place = placeResult[0];
                        setMarkerAndMove(
                            parseFloat(place.y),
                            parseFloat(place.x),
                            place.address_name || place.place_name
                        );
                    } else {
                        alert('주소 또는 장소를 찾을 수 없습니다.');
                    }
                });
            }
        });
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
                <span className="back-btn" onClick={handleBack}>&lt;</span>
                <h2 className="title">공동 주문 생성</h2>
            </div>

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

            <label className="label">배달 받을 위치</label>
            <div id="map" className="map-container"></div>
            <div className="address-search-row">
                <input
                    type="text"
                    className="input-field address-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                    placeholder="주소를 입력하고 검색하거나 지도를 클릭하세요"
                />
                <button
                    type="button"
                    className="search-btn"
                    onClick={handleAddressSearch}
                    disabled={!mapReady}
                >
                    {mapReady ? '검색' : '로딩...'}
                </button>
            </div>

            <label className="label">함께 먹기 방식</label>
            <div className="radio-group">
                <label>
                    <input
                        type="radio"
                        name="type"
                        checked={eatType === 'share'}
                        onChange={() => setEatType('share')}
                    /> 나눠먹기
                </label>
                <label>
                    <input
                        type="radio"
                        name="type"
                        checked={eatType === 'individual'}
                        onChange={() => setEatType('individual')}
                    /> 각자 먹기
                </label>
            </div>

            {cartItems.length > 0 && (
                <>
                    <label className="label">현재 장바구니</label>
                    <div className="cart-list">
                        {cartItems.map(item => (
                            <div key={item.menu_id} className="cart-item">
                                <div>
                                    <div className="menu-name">{item.menu_name}</div>
                                    <div className="menu-price">{item.menu_price?.toLocaleString()}원</div>
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

            <label className="label">메뉴 추가 선택</label>
            <div className="menu-list">
                {menus.length > 0 ? (
                    menus.map(menu => {
                        const isInCart = cartItems.some(item => item.menu_id === menu.id);
                        return (
                            <div key={menu.id} className={`menu-item ${isInCart ? 'in-cart' : ''}`}>
                                <div>
                                    <div className="menu-name">
                                        {menu.name}
                                        {isInCart && <span className="in-cart-badge">장바구니에 있음</span>}
                                    </div>
                                    <div className="menu-price">{menu.price?.toLocaleString()}원</div>
                                </div>
                                <input
                                    type="checkbox"
                                    className="menu-check"
                                    checked={selectedMenus.includes(menu.id)}
                                    onChange={() => handleMenuToggle(menu.id)}
                                    disabled={isInCart}
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
