import { createContext, useContext, useState, useEffect } from 'react';
import { usersAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 사용자 정보 API로 조회 (재시도 포함)
  const fetchUserInfo = async (email, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Fetching user info for: ${email} (attempt ${i + 1})`);
        const response = await usersAPI.getUserByEmail(email);
        console.log('User info response:', response.data);
        if (response.data) {
          setUser(response.data);
          return true;
        }
        // null 응답이면 잠시 대기 후 재시도
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    return false;
  };

  useEffect(() => {
    const initAuth = async () => {
      // URL에서 토큰 확인 (Google OAuth 콜백 후)
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');

      if (tokenFromUrl) {
        localStorage.setItem('token', tokenFromUrl);
        // URL에서 토큰 파라미터 제거
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // 로컬 스토리지에서 토큰 확인
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // JWT 디코딩 (base64)
          const payload = JSON.parse(atob(token.split('.')[1]));

          // 토큰 만료 확인
          if (payload.exp * 1000 > Date.now()) {
            // API로 전체 사용자 정보 조회
            await fetchUserInfo(payload.email);
          } else {
            // 토큰 만료됨
            localStorage.removeItem('token');
          }
        } catch (e) {
          console.error('Invalid token:', e);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (token) => {
    localStorage.setItem('token', token);
    const payload = JSON.parse(atob(token.split('.')[1]));
    // API로 전체 사용자 정보 조회
    await fetchUserInfo(payload.email);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // 사용자 정보 새로고침 (주소 저장 후 호출)
  const refreshUser = async () => {
    if (user?.email) {
      await fetchUserInfo(user.email);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
