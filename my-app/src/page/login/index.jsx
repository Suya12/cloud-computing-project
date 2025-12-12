import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import './style.css';

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // 이미 로그인되어 있으면 카테고리 페이지로 이동
    if (user) {
      navigate('/category');
    }

    // URL에서 에러 파라미터 확인
    const error = searchParams.get('error');
    if (error) {
      if (error === 'access_denied') {
        setErrorMessage('로그인이 취소되었습니다.');
      } else {
        setErrorMessage('로그인 중 오류가 발생했습니다.');
      }
    }
  }, [user, navigate, searchParams]);

  const handleGoogleLogin = async () => {
    try {
      const response = await authAPI.getGoogleLoginUrl();
      // Google 로그인 페이지로 리다이렉트
      window.location.href = response.data.login_url;
    } catch (error) {
      console.error('Failed to get Google login URL:', error);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">배달 공동 주문</h1>
        <p className="login-subtitle">간편하게 로그인하고</p>
        <p className="login-subtitle">맛있고 편하게 드세요</p>

        {errorMessage && (
          <div className="error-message">{errorMessage}</div>
        )}

        <button className="google-login-btn" onClick={handleGoogleLogin}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="google-icon"
          />
          Login with Google
        </button>
      </div>
    </div>
  );
}

export default Login;
