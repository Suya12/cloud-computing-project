import { useEffect, useState } from 'react';
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
    const { user, loading, logout } = useAuth();
    const [credit, setCredit] = useState(0);

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
                <div className="credit-section">
                    <div className="credit-info">
                        <span className="credit-label">내 크레딧</span>
                        <span className="credit-amount">{(credit || 0).toLocaleString()}원</span>
                    </div>
                    <button className="credit-btn" onClick={handleAddCredit}>충전</button>
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
