import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../api';
import './style.css';

const categories = [
    { emoji: '🍜', label: '중식' },
    { emoji: '🍗', label: '치킨' },
    { emoji: '🍚', label: '한식' },
    { emoji: '🍣', label: '일식' },
    { emoji: '🍕', label: '피자' },
    { emoji: '🍱', label: '기타' },
];

function CategoryCard({ emoji, label, onClick }) {
    return (
        <button className="card" onClick={onClick}>
            <div className="emoji">{emoji}</div>
            <div className="label">{label}</div>
        </button>
    );
}

export default function Category() {
    const navigate = useNavigate();
    const { user, loading, logout, refreshUser } = useAuth();
    const [credit, setCredit] = useState(0);
    const [address, setAddress] = useState('');
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [addressInput, setAddressInput] = useState('');
    const [selectedLat, setSelectedLat] = useState(null);
    const [selectedLng, setSelectedLng] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const geocoderRef = useRef(null);

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    // 크레딧 조회
    useEffect(() => {
        const fetchCredit = async () => {
            if (user?.id) {
                try {
                    const response = await usersAPI.getCredit(user.id);
                    setCredit(response.data.credit);
                } catch (error) {
                    console.error('Failed to fetch credit:', error);
                }
            }
        };
        fetchCredit();
    }, [user]);

    // 저장된 주소 불러오기
    useEffect(() => {
        if (user?.address) {
            setAddress(user.address);
        }
    }, [user]);

    const handleCategoryClick = (category) => {
        navigate(`/co_deliver_list?category=${encodeURIComponent(category)}`);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleAddCredit = async () => {
        const amount = prompt('충전할 금액을 입력하세요 (원):', '50000');
        if (amount && !isNaN(amount) && parseInt(amount) > 0) {
            try {
                await usersAPI.addCredit(user.id, parseInt(amount));
                const response = await usersAPI.getCredit(user.id);
                setCredit(response.data.credit);
                alert(`${parseInt(amount).toLocaleString()}원이 충전되었습니다!`);
            } catch (error) {
                console.error('Failed to add credit:', error);
                alert('크레딧 충전에 실패했습니다.');
            }
        }
    };

    // 주소 모달 열기
    const openAddressModal = () => {
        setAddressInput(address);
        setShowAddressModal(true);
    };

    // 모달이 열릴 때 지도 초기화
    useEffect(() => {
        if (!showAddressModal) return;
        if (mapInstanceRef.current) return;

        const initializeMap = () => {
            const container = mapContainerRef.current;
            if (!container || !window.kakao?.maps?.Map) return false;

            const options = {
                center: new window.kakao.maps.LatLng(35.8468, 127.1297),
                level: 3
            };

            const map = new window.kakao.maps.Map(container, options);
            mapInstanceRef.current = map;
            geocoderRef.current = new window.kakao.maps.services.Geocoder();

            window.kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
                const latlng = mouseEvent.latLng;
                placeMarker(latlng.getLat(), latlng.getLng());
                geocoderRef.current.coord2Address(
                    latlng.getLng(),
                    latlng.getLat(),
                    (result, status) => {
                        if (status === window.kakao.maps.services.Status.OK) {
                            setAddressInput(result[0].address.address_name);
                        }
                    }
                );
            });

            setMapLoaded(true);
            return true;
        };

        let attempts = 0;
        const maxAttempts = 50;

        const pollForKakaoMaps = () => {
            attempts++;
            if (window.kakao?.maps?.Map) {
                if (initializeMap()) return;
            }
            if (window.kakao?.maps?.load) {
                try {
                    window.kakao.maps.load(() => {
                        if (!mapInstanceRef.current) initializeMap();
                    });
                } catch (e) {}
            }
            if (attempts < maxAttempts && !mapInstanceRef.current) {
                setTimeout(pollForKakaoMaps, 100);
            }
        };

        const timer = setTimeout(pollForKakaoMaps, 100);
        return () => clearTimeout(timer);
    }, [showAddressModal]);

    const placeMarker = (lat, lng) => {
        if (!mapInstanceRef.current) return;
        const position = new window.kakao.maps.LatLng(lat, lng);
        if (markerRef.current) {
            markerRef.current.setMap(null);
        }
        const marker = new window.kakao.maps.Marker({ position });
        marker.setMap(mapInstanceRef.current);
        markerRef.current = marker;
        mapInstanceRef.current.setCenter(position);
        setSelectedLat(lat);
        setSelectedLng(lng);
    };

    const handleAddressSearch = () => {
        if (!addressInput.trim() || !geocoderRef.current) return;
        geocoderRef.current.addressSearch(addressInput, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const y = parseFloat(result[0].y);
                const x = parseFloat(result[0].x);
                placeMarker(y, x);
                setAddressInput(result[0].address_name);
            } else {
                alert('검색 결과가 없습니다.');
            }
        });
    };

    const handleSaveAddress = async () => {
        if (!addressInput.trim() || selectedLat === null || selectedLng === null) {
            alert('주소를 검색하거나 지도에서 위치를 선택해주세요.');
            return;
        }
        try {
            await usersAPI.updateAddress(user.id, addressInput, selectedLat, selectedLng);
            setAddress(addressInput);
            setShowAddressModal(false);
            // 사용자 정보 새로고침
            await refreshUser();
            mapInstanceRef.current = null;
            setMapLoaded(false);
            alert('주소가 저장되었습니다!');
        } catch (error) {
            console.error('Failed to save address:', error);
            alert('주소 저장에 실패했습니다.');
        }
    };

    const closeAddressModal = () => {
        setShowAddressModal(false);
        mapInstanceRef.current = null;
        setMapLoaded(false);
    };

    if (loading) {
        return <div className="container">로딩 중...</div>;
    }

    return (
        <div className="container">
            <div className="header-section">
                <h2 className="title">공동 배달 카테고리 리스트</h2>
                {user && (
                    <div className="user-info">
                        <span>{user.name}님</span>
                        <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
                    </div>
                )}
            </div>

            {user && (
                <div className="info-row">
                    <div className="address-section" onClick={openAddressModal}>
                        <div className="section-info">
                            <span className="section-label">내 주소</span>
                            <span className="address-text">{address || '주소를 설정하세요'}</span>
                        </div>
                        <span className="edit-icon">✎</span>
                    </div>
                    <div className="credit-section">
                        <div className="section-info">
                            <span className="section-label">내 크레딧</span>
                            <span className="credit-amount">{(credit || 0).toLocaleString()}원</span>
                        </div>
                        <button className="credit-btn" onClick={handleAddCredit}>충전</button>
                    </div>
                </div>
            )}

            {showAddressModal && (
                <div className="modal-overlay" onClick={closeAddressModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">주소 설정</h3>
                        <div
                            ref={mapContainerRef}
                            className="modal-map"
                        />
                        <div className="modal-search-row">
                            <input
                                type="text"
                                className="modal-input"
                                value={addressInput}
                                onChange={(e) => setAddressInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                                placeholder="주소 입력 후 검색"
                            />
                            <button
                                className="modal-search-btn"
                                onClick={handleAddressSearch}
                                disabled={!mapLoaded}
                            >
                                검색
                            </button>
                        </div>
                        <div className="modal-buttons">
                            <button className="modal-cancel-btn" onClick={closeAddressModal}>취소</button>
                            <button className="modal-save-btn" onClick={handleSaveAddress}>저장</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid">
                {categories.map((cat) => (
                    <CategoryCard
                        key={cat.label}
                        emoji={cat.emoji}
                        label={cat.label}
                        onClick={() => handleCategoryClick(cat.label)}
                    />
                ))}
            </div>

            <p className="info-text">카테고리를 선택하면 공동주문 목록 또는 새 주문을 만들 수 있어요</p>

            <button className="my-orders-btn" onClick={() => navigate('/my_orders')}>
                내 주문 확인하기
            </button>
        </div>
    );
}
