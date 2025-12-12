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
    const [now, setNow] = useState(new Date());

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

    // 1초마다 현재 시간 업데이트 (남은 시간 표시용)
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 남은 시간 계산
    const getRemainingTime = (expiresAt) => {
        if (!expiresAt) return null;
        const expireDate = new Date(expiresAt);
        const diff = expireDate - now;

        if (diff <= 0) return { text: '만료됨', expired: true };

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        if (minutes > 0) {
            return { text: `${minutes}분 ${seconds}초`, expired: false };
        }
        return { text: `${seconds}초`, expired: false, urgent: true };
    };

    const handleBack = () => {
        navigate('/category');
    };

    const handleOrderClick = (orderId) => {
        navigate(`/deliver_process?order_id=${orderId}`);
    };

    const handleDeleteOrder = async (e, orderId) => {
        e.stopPropagation();
        if (window.confirm('이 주문을 삭제하시겠습니까? 결제 금액이 환불됩니다.')) {
            try {
                await ordersAPI.deleteOrder(orderId, user.id);
                setOrders(orders.filter(order => order.id !== orderId));
                alert('주문이 삭제되었습니다.');
            } catch (error) {
                console.error('Failed to delete order:', error);
                alert(error.response?.data?.detail || '주문 삭제에 실패했습니다.');
            }
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading || loadingOrders) {
        return <div className="my-orders-container">로딩 중...</div>;
    }

    return (
        <div className="my-orders-container">
            <div className="header-row">
                <span className="back-btn" onClick={handleBack}>&lt;</span>
                <h2 className="title">내 주문 목록</h2>
            </div>

            {orders.length === 0 ? (
                <div className="empty-state">
                    <p>참여 중인 주문이 없습니다.</p>
                    <button className="go-category-btn" onClick={handleBack}>
                        공동 주문 찾아보기
                    </button>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => {
                        const remaining = getRemainingTime(order.expires_at);
                        return (
                            <div
                                key={order.id}
                                className={`order-card ${remaining?.expired ? 'expired' : ''}`}
                                onClick={() => handleOrderClick(order.id)}
                            >
                                <div className="order-header">
                                    <span className="store-name">{order.store_name}</span>
                                    <span className="order-category">{order.store_category}</span>
                                </div>
                                {remaining && (
                                    <div className={`remaining-time ${remaining.expired ? 'expired' : ''} ${remaining.urgent ? 'urgent' : ''}`}>
                                        <span className="time-icon">⏱</span>
                                        <span className="time-text">
                                            {remaining.expired ? '매칭 시간 만료' : `남은 시간: ${remaining.text}`}
                                        </span>
                                    </div>
                                )}
                                <div className="order-details">
                                    <div className="detail-row">
                                        <span className="label">배달 위치</span>
                                        <span className="value">{order.delivery_location}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">결제 금액</span>
                                        <span className="value">{order.owner_paid_amount?.toLocaleString()}원</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">주문 방식</span>
                                        <span className="value">{order.split_type ? '나눠먹기' : '각자먹기'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">주문 시간</span>
                                        <span className="value">{formatDate(order.created_at)}</span>
                                    </div>
                                </div>
                                <div className="order-footer">
                                    {order.creator_id === user.id && (
                                        <span className="creator-badge">내가 생성</span>
                                    )}
                                    {order.creator_id === user.id && (
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
