import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storesAPI } from '../../api';
import './style.css';

export default function Store_select() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const category = searchParams.get('category');

    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStores = async () => {
            if (!category) {
                setLoading(false);
                return;
            }
            try {
                const response = await storesAPI.getStoresByCategory(category);
                setStores(response.data);
            } catch (error) {
                console.error('Failed to fetch stores:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, [category]);

    const handleStoreClick = (store) => {
        // 가게 선택 시 공동 주문 생성 페이지로 이동
        navigate(`/co_order_create?store_id=${store.id}&category=${encodeURIComponent(category)}`);
    };

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="app">
            <header className="header">
                <div className="back" onClick={handleBack}>&lt;</div>
                <div className="header-title">가게 선택</div>
            </header>

            <main className="content">
                <div className="category-text">
                    선택된 카테고리: <span>{category || '전체'}</span>
                </div>

                <div className="store-list">
                    {loading ? (
                        <p className="notice-text">로딩 중...</p>
                    ) : stores.length > 0 ? (
                        stores.map(store => (
                            <div
                                className="store-card"
                                key={store.id}
                                onClick={() => handleStoreClick(store)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="store-info">
                                    <div className="store-name">{store.name}</div>
                                    <div className="store-meta">
                                        최소주문 {store.minimum_price?.toLocaleString()}원 · 배달팁 {store.delivery_tip?.toLocaleString()}원
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="notice-text">해당 카테고리의 가게가 없습니다.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
