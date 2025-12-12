import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { storesAPI, cartAPI, matchAPI, ordersAPI } from '../../api';
import './style.css';

export default function Pay() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');
    const storeId = searchParams.get('store_id');
    const { user } = useAuth();

    const [store, setStore] = useState(null);
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMenus, setSelectedMenus] = useState([]);
    const [existingItems, setExistingItems] = useState([]);

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

                // 기존 주문 메뉴 가져오기
                if (orderId) {
                    const orderRes = await ordersAPI.getOrderDetail(orderId);
                    setExistingItems(orderRes.data.items || []);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [storeId, orderId]);

    const handleMenuToggle = (menuId) => {
        setSelectedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const handleSubmit = async () => {
        if (selectedMenus.length === 0) {
            alert('최소 1개 이상의 메뉴를 선택해주세요.');
            return;
        }

        try {
            // 1. 장바구니에 선택한 메뉴 추가
            for (const menuId of selectedMenus) {
                await cartAPI.addItem(user.id, storeId, menuId);
            }

            // 2. 주문 매칭
            await matchAPI.matchOrder(orderId, user.id);

            alert('주문 매칭이 완료되었습니다!');
            navigate(`/deliver_process?order_id=${orderId}`);
        } catch (error) {
            console.error('Failed to match order:', error);
            alert(error.response?.data?.detail || '결제에 실패했습니다.');
        }
    };

    const handleBack = () => {
        navigate(-1);
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
                <h2 className="title">메뉴 선택 및 결제</h2>
            </div>

            <div className="info-box">
                <div className="row">
                    <span>가게</span>
                    <span>{store.name}</span>
                </div>
                <div className="row">
                    <span>카테고리</span>
                    <span>{store.category}</span>
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

            {existingItems.length > 0 && (
                <>
                    <label className="label">기존 주문 메뉴</label>
                    <div className="existing-list">
                        {existingItems.map((item, index) => (
                            <div key={index} className="existing-item">
                                <span>{item.menu_name}</span>
                                <span>{item.price?.toLocaleString()}원</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <label className="label">내 메뉴 선택</label>

            <div className="menu-list">
                {menus.length > 0 ? (
                    menus.map(menu => (
                        <div key={menu.id} className={`menu-item ${selectedMenus.includes(menu.id) ? 'selected' : ''}`}>
                            <div>
                                <div className="menu-name">{menu.name}</div>
                                <div className="menu-price">{menu.price?.toLocaleString()}원</div>
                            </div>
                            <input
                                type="checkbox"
                                className="menu-check"
                                checked={selectedMenus.includes(menu.id)}
                                onChange={() => handleMenuToggle(menu.id)}
                            />
                        </div>
                    ))
                ) : (
                    <p>메뉴가 없습니다.</p>
                )}
            </div>

            {selectedMenus.length > 0 && (
                <div className="selected-summary">
                    <label className="label">선택한 메뉴</label>
                    <div className="summary-list">
                        {selectedMenus.map(menuId => {
                            const menu = menus.find(m => m.id === menuId);
                            return menu ? (
                                <div key={menuId} className="summary-item">
                                    <span>{menu.name}</span>
                                    <span>{menu.price?.toLocaleString()}원</span>
                                </div>
                            ) : null;
                        })}
                        <div className="summary-total">
                            <span>합계</span>
                            <span>
                                {selectedMenus.reduce((sum, menuId) => {
                                    const menu = menus.find(m => m.id === menuId);
                                    return sum + (menu?.price || 0);
                                }, 0).toLocaleString()}원
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <button className="submit-btn" onClick={handleSubmit}>
                결제하기
            </button>
        </div>
    );
}
