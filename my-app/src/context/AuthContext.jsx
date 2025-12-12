import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          setUser({
            email: payload.email,
            name: payload.name,
            id: payload.user_id,
          });
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
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    const payload = JSON.parse(atob(token.split('.')[1]));
    setUser({
      email: payload.email,
      name: payload.name,
      id: payload.user_id,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
