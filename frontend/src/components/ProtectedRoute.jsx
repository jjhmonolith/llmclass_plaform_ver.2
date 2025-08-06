/**
 * 인증이 필요한 라우트를 보호하는 컴포넌트
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 로딩 중일 때
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={`/teacher/login?next=${encodeURIComponent(location.pathname)}`} 
        replace 
      />
    );
  }

  // 인증된 경우 자식 컴포넌트 렌더링
  return children;
}