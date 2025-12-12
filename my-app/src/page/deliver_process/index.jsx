import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ordersAPI } from '../../api';
import './style.css';

export default function Deliver_process() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [remainingTime, setRemainingTime] = useState(30);
    const [isMatched, setIsMatched] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }
            try {
                const response = await ordersAPI.getOrderDetail(orderId);
                setOrder(response.data);

                // 매칭 여부 확인: items에서 서로 다른 user_id가 있으면 매칭 완료
                const userIds = [...new Set(response.data.items?.map(item => item.user_id) || [])];
                setIsMatched(userIds.length > 1);

                // 남은 시간 계산
                if (response.data.expires_at) {
                    const expiresAt = new Date(response.data.expires_at);
                    const now = new Date();
                    const diffMinutes = Math.max(0, Math.floor((expiresAt - now) / 60000));
                    setRemainingTime(diffMinutes);
                }
            } catch (error) {
                console.error('Failed to fetch order:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();

        // 매칭 대기 중일 때 주기적으로 상태 확인 (10초마다)
        const pollInterval = setInterval(fetchOrder, 10000);
        return () => clearInterval(pollInterval);
    }, [orderId]);

    // 남은 시간 카운트다운
    useEffect(() => {
        if (remainingTime <= 0) return;

        const timer = setInterval(() => {
            setRemainingTime(prev => Math.max(0, prev - 1));
        }, 60000); // 1분마다 업데이트

        return () => clearInterval(timer);
    }, [remainingTime]);

    const handleBack = () => {
        navigate('/category');
    };

    // 전체 주문 메뉴
    const allItems = order?.items || [];

    if (loading) {
        return <div className="order-box">로딩 중...</div>;
    }

    if (!order) {
        return <div className="order-box">주문 정보를 찾을 수 없습니다.</div>;
    }

    // 매칭 대기 중 UI
    if (!isMatched) {
        return (
            <div className="order-box">
                <h2 className="title">매칭 대기 중</h2>

                <div className="waiting-section">
                    <div className="waiting-icon">⏳</div>
                    <p className="waiting-text">다른 사용자의 참여를 기다리고 있습니다</p>
                    <p className="waiting-subtext">남은 시간: {remainingTime}분</p>
                </div>

                <div className="info-box">
                    <h3 className="section-title">주문 정보</h3>
                    <div className="row">
                        <span>가게</span>
                        <span>{order.store_name}</span>
                    </div>
                    <div className="row">
                        <span>배달 위치</span>
                        <span>{order.delivery_location}</span>
                    </div>
                    <div className="row">
                        <span>먹기 방식</span>
                        <span>{order.split_type ? '나눠먹기' : '따로먹기'}</span>
                    </div>
                </div>

                <div className="info-box">
                    <h3 className="section-title">내가 선택한 메뉴</h3>
                    {allItems.length > 0 ? (
                        allItems.map((item, index) => (
                            <div key={index} className="row">
                                <span>{item.menu_name}</span>
                                <span>{item.price?.toLocaleString()}원</span>
                            </div>
                        ))
                    ) : (
                        <div className="row">
                            <span>메뉴 정보 없음</span>
                        </div>
                    )}
                </div>

                <button className="home-btn" onClick={handleBack}>
                    홈으로 돌아가기
                </button>
            </div>
        );
    }

    // 매칭 완료 후 주문 현황 UI
    return (
        <div className="order-box">
            <h2 className="title">주문 현황</h2>

            <div className="time-section">
                <span className="arrival-time">{remainingTime}분 후</span>
                <span className="arrival-label">도착예정</span>
            </div>

            <div className="info-box">
                <h3 className="section-title">주문 정보</h3>
                <div className="row">
                    <span>가게</span>
                    <span>{order.store_name}</span>
                </div>
                <div className="row">
                    <span>배달 위치</span>
                    <span>{order.delivery_location}</span>
                </div>
                <div className="row">
                    <span>먹기 방식</span>
                    <span>{order.split_type ? '나눠먹기' : '따로먹기'}</span>
                </div>
                <div className="row">
                    <span>내 결제금액</span>
                    <span>{order.owner_paid_amount?.toLocaleString()}원</span>
                </div>
            </div>

            <div className="info-box">
                <h3 className="section-title">전체 주문 메뉴</h3>
                {allItems.length > 0 ? (
                    allItems.map((item, index) => (
                        <div key={index} className="row">
                            <span>{item.menu_name}</span>
                            <span>{item.price?.toLocaleString()}원</span>
                        </div>
                    ))
                ) : (
                    <div className="row">
                        <span>메뉴 정보 없음</span>
                    </div>
                )}
            </div>

            <button className="home-btn" onClick={handleBack}>
                홈으로 돌아가기
            </button>
        </div>
    );
}
