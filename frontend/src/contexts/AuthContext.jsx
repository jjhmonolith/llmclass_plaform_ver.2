/**
 * 인증 상태 관리를 위한 React Context
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, ApiError } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

/**
 * 인증 컨텍스트 프로바이더
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * 현재 사용자 정보 로드
   */
  const loadUser = async () => {
    try {
      const userData = await authApi.me();
      setUser(userData);
      
      // 세션 갱신 확인 (서버에서 자동 갱신됨)
      console.log('✅ 사용자 세션 확인됨:', userData.email);
    } catch (error) {
      // 인증되지 않은 상태는 정상적인 경우
      setUser(null);
      
      if (error instanceof ApiError && error.status === 401) {
        console.log('ℹ️  인증되지 않은 상태');
      } else {
        console.error('❌ 사용자 정보 로드 오류:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 로그인 함수
   */
  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      setUser(response.teacher);
      toast.success(response.message);
      return { success: true };
    } catch (error) {
      let errorMessage = '로그인에 실패했습니다.';
      
      if (error instanceof ApiError) {
        errorMessage = error.detail.message || errorMessage;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * 로그아웃 함수
   */
  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      toast.success('로그아웃되었습니다.');
    } catch (error) {
      // 로그아웃은 실패해도 로컬 상태는 정리
      setUser(null);
      console.error('로그아웃 오류:', error);
    }
  };

  /**
   * 컴포넌트 마운트 시 사용자 정보 로드
   */
  useEffect(() => {
    loadUser();
  }, []);

  /**
   * 주기적 세션 확인 (10분마다)
   */
  useEffect(() => {
    if (!user) return;

    const sessionCheck = setInterval(async () => {
      try {
        await authApi.me();
        console.log('🔄 세션 자동 갱신 확인');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          console.log('🚪 세션 만료됨, 로그아웃 처리');
          setUser(null);
          toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
        }
      }
    }, 10 * 60 * 1000); // 10분

    return () => clearInterval(sessionCheck);
  }, [user]);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 인증 컨텍스트 사용을 위한 커스텀 훅
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서 사용되어야 합니다.');
  }
  return context;
}