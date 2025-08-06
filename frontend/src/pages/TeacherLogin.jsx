/**
 * 교사 로그인 페이지
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function TeacherLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /**
   * 이미 로그인된 경우 리다이렉트
   */
  useEffect(() => {
    if (isAuthenticated) {
      const nextPath = searchParams.get('next') || '/teacher/home';
      navigate(nextPath, { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  /**
   * 입력 필드 변경 핸들러
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * 개발용 자동채움 핸들러
   */
  const handleDevAutoFill = () => {
    setFormData({
      email: 'demo@teacher.com',
      password: 'demo123',
    });
    toast.success('개발용 계정으로 자동 채워졌습니다.');
  };

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    // 입력 검증
    if (!formData.email.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    if (!formData.password.trim()) {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        const nextPath = searchParams.get('next') || '/teacher/home';
        navigate(nextPath, { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>교사 로그인</h1>
          <p>LLM Class Platform에 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="이메일을 입력하세요"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="비밀번호를 입력하세요"
              required
              disabled={isSubmitting}
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>

          {/* 개발용 자동채움 버튼 */}
          <button 
            type="button" 
            onClick={handleDevAutoFill}
            className="dev-autofill-button"
            disabled={isSubmitting}
          >
            🔧 개발용 자동채움
          </button>
        </form>

        <div className="login-footer">
          <p>개발용 계정: demo@teacher.com / demo123</p>
        </div>
      </div>
    </div>
  );
}