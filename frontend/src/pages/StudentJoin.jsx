import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinApi } from '../utils/api';
import { getSessionCache, saveSessionCache, clearSessionCache } from '../utils/sessionCache';
import { saveSecureSessionCache, clearSecureSessionCache, getSecureSessionCache } from '../utils/browserSession';
import toast from 'react-hot-toast';

export default function StudentJoin() {
  const navigate = useNavigate();
  
  // 상태 관리
  const [step, setStep] = useState('initial'); // 'initial', 'pin_required'
  const [code, setCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [rejoinPin, setRejoinPin] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 캐시된 세션 확인
  const [cachedSession, setCachedSession] = useState(null);
  const [showCachePrompt, setShowCachePrompt] = useState(false);

  useEffect(() => {
    // 페이지 로드시 캐시된 세션 확인
    const cached = getSessionCache();
    if (cached) {
      setCachedSession(cached);
      setShowCachePrompt(true);
    }
  }, []);

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    
    if (!code.trim() || code.length !== 6) {
      toast.error('6자리 코드를 입력해주세요.');
      return;
    }
    
    if (!studentName.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }
    
    if (studentName.trim().length > 20) {
      toast.error('이름은 20자 이하로 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const result = await joinApi.join(code, studentName.trim());
      
      if (result.rejoin_pin) {
        // 신규 사용자 - PIN과 토큰을 보안 캐시에 저장
        saveSecureSessionCache(result.run_id, result.student_name, result.rejoin_pin, result.activity_token);
        // 기존 방식도 유지 (호환성)
        saveSessionCache(result.run_id, result.student_name, result.rejoin_pin, result.activity_token);
        toast.success(`${result.student_name}님, 세션에 참여했습니다! 재참여 PIN: ${result.rejoin_pin}`);
        navigate('/student/learn');
      } else {
        // 재참여 성공 - 토큰을 보안 캐시에 저장
        saveSecureSessionCache(result.run_id, result.student_name, null, result.activity_token);
        // 기존 방식도 유지 (호환성)
        saveSessionCache(result.run_id, result.student_name, null, result.activity_token);
        toast.success('세션에 재참여했습니다!');
        navigate('/student/learn');
      }
      
    } catch (error) {
      console.error('Join error:', error);
      
      if (error.status === 409 && error.detail?.error === 'requires_pin') {
        // PIN 입력 필요
        setStep('pin_required');
        toast.info(error.detail.message);
      } else {
        // 기타 오류
        const errorMsg = getErrorMessage(error);
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    
    if (!rejoinPin.trim() || rejoinPin.length !== 2) {
      toast.error('2자리 재참여 PIN을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const result = await joinApi.join(code, studentName.trim(), rejoinPin);
      
      // 재참여 성공 - 입력한 PIN과 토큰을 보안 캐시에 저장
      saveSecureSessionCache(result.run_id, result.student_name, rejoinPin, result.activity_token);
      // 기존 방식도 유지 (호환성)
      saveSessionCache(result.run_id, result.student_name, rejoinPin, result.activity_token);
      toast.success('세션에 재참여했습니다!');
      navigate('/student/learn');
      
    } catch (error) {
      console.error('Rejoin error:', error);
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };


  const handleUseCachedSession = () => {
    if (cachedSession) {
      // 보안 캐시와 기존 캐시 모두 저장
      saveSecureSessionCache(cachedSession.runId, cachedSession.studentName, cachedSession.rejoinPin, cachedSession.activityToken);
      saveSessionCache(cachedSession.runId, cachedSession.studentName, cachedSession.rejoinPin, cachedSession.activityToken);
      toast.success('이전 세션으로 돌아갑니다!');
      navigate('/student/learn');
    }
  };

  const handleStartNewSession = () => {
    clearSessionCache();
    clearSecureSessionCache(); // 보안 캐시도 삭제
    setShowCachePrompt(false);
    setCachedSession(null);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('클립보드에 복사되었습니다!');
    } catch (err) {
      // 폴백
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('복사되었습니다!');
    }
  };

  const getErrorMessage = (error) => {
    switch (error.status) {
      case 400: return error.detail || '잘못된 입력입니다.';
      case 401: return '재참여 PIN이 올바르지 않습니다.';
      case 403: return '세션 참여 인원이 가득찼습니다.';
      case 404: return '코드가 유효하지 않습니다.';
      case 410: return '세션이 종료되었습니다.';
      case 429: return '잠시 후 다시 시도해주세요.';
      default: return error.message || '오류가 발생했습니다.';
    }
  };

  // 캐시된 세션 복구 프롬프트
  if (showCachePrompt && cachedSession) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          border: '2px solid #2196f3', 
          borderRadius: '12px', 
          padding: '30px' 
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#1976d2' }}>
            🔄 이전 세션 발견
          </h1>
          
          <div style={{ marginBottom: '25px', color: '#555' }}>
            <p style={{ marginBottom: '10px' }}>
              <strong>{cachedSession.studentName}</strong>님의 세션이 있습니다.
            </p>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              마지막 활동: {cachedSession.lastActivityAt?.toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              {cachedSession.remainingMinutes}분 후 만료됩니다.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleUseCachedSession}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              이전 세션으로 돌아가기
            </button>
            
            <button
              onClick={handleStartNewSession}
              style={{
                padding: '12px 24px',
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              새 세션 시작
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div style={{ padding: '40px 20px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '10px', color: '#333' }}>
          🎓 세션 참여
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          선생님께서 알려주신 코드와 이름을 입력해주세요.
        </p>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #ddd', 
        borderRadius: '12px', 
        padding: '30px' 
      }}>
        {step === 'initial' && (
          <form onSubmit={handleInitialSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                세션 코드 (6자리)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength="6"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  letterSpacing: '4px'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                이름 (최대 20자)
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value.slice(0, 20))}
                placeholder="홍길동"
                maxLength="20"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                required
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                {studentName.length}/20자
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: loading ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '참여 중...' : '세션 참여하기'}
            </button>
          </form>
        )}

        {step === 'pin_required' && (
          <form onSubmit={handlePinSubmit}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#d32f2f' }}>
                🔐 재참여 PIN 입력
              </h2>
              <p style={{ color: '#666', marginBottom: '5px' }}>
                <strong>{studentName}</strong>님은 이미 참여한 적이 있습니다.
              </p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                처음 참여할 때 받으신 2자리 PIN을 입력해주세요.
              </p>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                재참여 PIN (2자리)
              </label>
              <input
                type="text"
                value={rejoinPin}
                onChange={(e) => setRejoinPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="12"
                maxLength="2"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '20px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  letterSpacing: '8px'
                }}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('initial');
                  setRejoinPin('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                뒤로가기
              </button>
              
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '12px',
                  backgroundColor: loading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '확인 중...' : '재참여하기'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px', 
        fontSize: '14px', 
        color: '#666' 
      }}>
        💡 문제가 있으시면 선생님께 문의해주세요.
      </div>
    </div>
  );
}