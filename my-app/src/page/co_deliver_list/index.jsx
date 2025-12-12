import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ordersAPI, storesAPI } from '../../api';
import './style.css';

export default function Co_deliver_list() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const category = searchParams.get('category');

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!category) {
                setLoading(false);
                return;
            }
            try {
                const response = await ordersAPI.getOrdersByCategory(category);
                // 주문 데이터에 가게 정보 추가
                const ordersWithStore = await Promise.all(
                    response.data.map(async (order) => {
                        try {
                            const storeRes = await storesAPI.getStoreById(order.store_id);
                            return {
                                ...order,
                                store: storeRes.data[0]
                            };
                        } catch {
                            return { ...order, store: null };
                        }
                    })
                );
                setOrders(ordersWithStore);
            } catch (error) {
                console.error('Failed to fetch orders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [category]);

    const handleOrderClick = (order) => {
        // 주문 클릭 시 메뉴 선택/결제 페이지로 이동
        navigate(`/pay?order_id=${order.id}&store_id=${order.store_id}`);
    };

    const handleCreateOrder = () => {
        // 새 공동 주문 생성: 가게 선택 페이지로 이동
        navigate(`/store_select?category=${encodeURIComponent(category)}`);
    };

    const handleBack = () => {
        navigate('/category');
    };

    return (
        <div className="app">
            <header className="header">
                <div className="back" onClick={handleBack}>&lt;</div>
                <div className="header-title">공동 주문 / {category || '전체'}</div>
            </header>

            <main className="content">
                <div className="order-list">
                    {loading ? (
                        <p className="empty-message">로딩 중...</p>
                    ) : orders.length > 0 ? (
                        orders.map(order => (
                            <div
                                className="order-card"
                                key={order.id}
                                onClick={() => handleOrderClick(order)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="order-info">
                                    <div className="order-store">{order.store?.name || '가게 정보 없음'}</div>
                                    <div className="order-meta">
                                        최소주문 {order.store?.minimum_price?.toLocaleString() || '-'}원 · 위치: {order.delivery_location}
                                    </div>
                                </div>
                                <div className={`order-tag ${order.split_type ? 'tag-share' : 'tag-direct'}`}>
                                    {order.split_type ? '나눠먹기' : '따로먹기'}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="empty-message">해당 카테고리의 공동주문이 없습니다.</p>
                    )}
                </div>
            </main>

            <footer className="footer">
                <button className="btn-primary" onClick={handleCreateOrder}>공동 주문 생성하기</button>
            </footer>
        </div>
    );
}
