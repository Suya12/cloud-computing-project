import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ordersAPI } from '../../api';
import './style.css';

export default function MyOrders() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        const fetchOrders = async () => {
            if (user?.id) {
                try {
                    const response = await ordersAPI.getMyOrders(user.id);
                    setOrders(response.data);
                } catch (error) {
                    console.error('Failed to fetch orders:', error);
                }
            }
            setLoadingOrders(false);
        };
        fetchOrders();
    }, [user]);

    const handleOrderClick = (orderId) => {
        navigate(`/deliver_process?order_id=${orderId}`);
    };

    const handleDeleteOrder = async (e, orderId) => {
        e.stopPropagation();
        if (!window.confirm('이 주문을 삭제하시겠습니까?')) return;

        try {
            await ordersAPI.deleteOrder(orderId, user.id);
            setOrders(orders.filter(o => o.id !== orderId));
        } catch {
            alert('주문 삭제 실패');
        }
    };

    const formatDate = (dateString) =>
        new Date(dateString).toLocaleString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });

    if (loading || loadingOrders) {
        return <div className="my-orders-container">로딩 중...</div>;
    }

    return (
        <div className="my-orders-container">
            <div className="header-row">
                <span className="back-btn" onClick={() => navigate('/category')}>&lt;</span>
                <h2 className="title">내 주문 목록</h2>
            </div>

            {orders.length === 0 ? (
                <div className="empty-state">
                    <p>참여 중인 주문이 없습니다.</p>
                    <button className="go-category-btn" onClick={() => navigate('/category')}>
                        공동 주문 찾아보기
                    </button>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => {
                        const isMatched = order.status === 'matched';

                        return (
                            <div
                                key={order.id}
                                className={`order-card ${isMatched ? 'matched' : ''}`}
                                onClick={() => handleOrderClick(order.id)}
                            >
                                <div className="order-top">
                                    <div className="order-main-info">
                                        <div className="store-name">{order.store_name}</div>
                                        <div className="order-meta">
                                            <span className="order-category">{order.store_category}</span>
                                            <span className="order-location">{order.delivery_location}</span>
                                        </div>
                                    </div>

                                    {isMatched && (
                                        <div className="order-status">
                                            <div className="matched-status">
                                                <span className="status-icon">✔</span>
                                                <span className="status-text">매칭 완료</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="order-bottom">
                                    <div className="order-info-grid">
                                        <div className="info-item">
                                            <span className="label">결제</span>
                                            <span className="value">
                                                {order.owner_paid_amount?.toLocaleString()}원
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="label">방식</span>
                                            <span className="value">
                                                {order.split_type ? '나눠먹기' : '각자먹기'}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="label">시간</span>
                                            <span className="value">{formatDate(order.created_at)}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="label">내 주문</span>
                                            <span className="value">
                                                {order.creator_id === user?.id ? 'O' : 'X'}
                                            </span>
                                        </div>
                                    </div>

                                    {order.creator_id === user?.id && (
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => handleDeleteOrder(e, order.id)}
                                        >
                                            삭제
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
