import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSessionCache, saveSessionCache } from '../utils/sessionCache';
import { getSecureSessionCache, validateSession } from '../utils/browserSession';
import { useActivityLogger } from '../hooks/useActivityLogger';
import SocraticChat from '../components/SocraticChat';
import toast from 'react-hot-toast';

export default function StudentLearn() {
  const navigate = useNavigate();
  
  // URL 파라미터 대신 세션 캐시에서 정보 가져오기
  const [runId, setRunId] = useState(null);
  const [studentName, setStudentName] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [cachedSession, setCachedSession] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  
  // 세션 및 템플릿 정보
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isSocraticMode, setIsSocraticMode] = useState(false);
  
  // 더미 활동 상태
  const [currentActivity, setCurrentActivity] = useState('writing.step1');
  const [turnIndex, setTurnIndex] = useState(1);
  const [studentInput, setStudentInput] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  
  // 세션 종료 콜백
  const handleSessionEnded = () => {
    setSessionEnded(true);
  };

  // 활동 로깅 훅
  const { saveTurn, logStudentInput, logAIResponse, logComplete, isLogging } = useActivityLogger(
    cachedSession?.activityToken,
    runId,
    studentName,
    handleSessionEnded
  );

  // 세션 정보 가져오기
  const fetchSessionInfo = async (token) => {
    try {
      const response = await fetch('/api/session/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const info = await response.json();
        setSessionInfo(info);
        
        // 소크라테스식 모드 확인
        if (info.template?.mode_id === 'socratic') {
          setIsSocraticMode(true);
        }
        
        console.log('Session info loaded:', info);
        return info;
      } else {
        console.error('Failed to fetch session info:', response.status);
      }
    } catch (error) {
      console.error('Error fetching session info:', error);
    }
    return null;
  };

  useEffect(() => {
    // 보안 강화된 세션 검증
    const validation = validateSession();
    
    if (!validation.valid) {
      let message = '유효한 세션이 없습니다. 다시 참여해주세요.';
      
      if (validation.reason === 'no_session') {
        message = '세션 정보가 없습니다. 다시 참여해주세요.';
      } else if (validation.reason === 'incomplete_session') {
        message = '세션 정보가 불완전합니다. 다시 참여해주세요.';
      }
      
      toast.error(message);
      navigate('/student/join');
      return;
    }
    
    const cached = validation.session;
    
    // 세션 정보 설정
    setRunId(cached.runId);
    setStudentName(cached.studentName);
    setCachedSession(cached);
    
    // 기존 방식의 캐시도 유지 (호환성)
    saveSessionCache(cached.runId, cached.studentName, cached.rejoinPin, cached.activityToken);
    
    // 세션 상태를 먼저 확인
    const checkSessionStatus = async () => {
      try {
        const response = await fetch('/api/session/status', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cached.activityToken}`,
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.status === 410) {
          // 세션이 이미 종료됨 - 종료 상태로 설정
          console.log('Session is already ended, showing ended state');
          setSessionEnded(true);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Session status check failed:', error);
      }
      
      // 세션이 활성 상태이면 정보 가져오기
      fetchSessionInfo(cached.activityToken).then(() => {
        setLoading(false);
      });
    };
    
    checkSessionStatus();

    // iframe 메시지 리스너 (소크라테스 모드용)
    const handleIframeMessage = (event) => {
      if (event.data.source === 'proto4-chat') {
        console.log('Proto4 message:', event.data);
        
        switch (event.data.type) {
          case 'exit_to_new_session':
            // 새 세션 참여로 이동
            localStorage.removeItem('sessionCache');
            sessionStorage.clear();
            navigate('/student/join');
            break;
          case 'session_ended':
            // 세션 종료 처리 (이미 플랫폼에서 감지되었을 것)
            console.log('Session ended from Proto4');
            break;
          case 'error':
            console.error('Proto4 error:', event.data.data);
            toast.error(`학습 오류: ${event.data.data.message}`);
            break;
          case 'learning_completed':
            console.log('Learning completed:', event.data.data);
            toast.success(`🎉 학습 완료! 이해도: ${event.data.data.understanding_score}%`);
            break;
          case 'initial_message_loaded':
            console.log('Proto4 초기 메시지 로드 완료');
            break;
          case 'conversation_progress':
            console.log(`대화 진행: Turn ${event.data.data.turn}, 점수: ${event.data.data.understanding_score}%`);
            break;
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);

    // 10초마다 세션 상태 확인 및 자동 갱신
    const activityInterval = setInterval(async () => {
      const currentCache = getSessionCache();
      if (currentCache && currentCache.runId && currentCache.studentName) {
        // 세션 상태 확인을 위한 전용 API 호출
        try {
          const response = await fetch('/api/session/status', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${currentCache.activityToken}`,
              'Cache-Control': 'no-cache'
            }
          });
          
          if (response.status === 410) {
            // 세션 종료됨
            console.log('Session ended detected via status check');
            setSessionEnded(true);
            clearInterval(activityInterval);
            return;
          }
        } catch (error) {
          console.log('Session status check failed:', error);
        }
        
        // 캐시 갱신
        saveSessionCache(currentCache.runId, currentCache.studentName, currentCache.rejoinPin, currentCache.activityToken);
        console.log('Session cache auto-refreshed');
      }
    }, 10 * 1000); // 10초마다

    // 사용자 활동 감지로 캐시 갱신 (마우스, 키보드, 스크롤)
    let lastActivityTime = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      // 마지막 갱신으로부터 1분 이상 지났을 때만 갱신 (너무 자주 갱신 방지)
      if (now - lastActivityTime > 60 * 1000) {
        const currentCache = getSessionCache();
        if (currentCache && currentCache.runId && currentCache.studentName) {
          saveSessionCache(currentCache.runId, currentCache.studentName, currentCache.rejoinPin, currentCache.activityToken);
          console.log('Session cache refreshed due to user activity');
          lastActivityTime = now;
        }
      }
    };

    // 이벤트 리스너 등록
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      clearInterval(activityInterval);
      window.removeEventListener('message', handleIframeMessage);
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [navigate]);

  const handleBackToJoin = () => {
    navigate('/student/join');
  };

  const handleShowPin = () => {
    if (cachedSession?.rejoinPin) {
      setShowPinModal(true);
    } else {
      toast.error('재참여 PIN 정보가 없습니다.');
    }
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

  // 더미 활동 함수들
  const handleStudentSubmit = async () => {
    if (!studentInput.trim()) {
      toast.error('입력을 작성해주세요.');
      return;
    }

    // 1단계: 학생 입력 저장
    const success = await logStudentInput(currentActivity, turnIndex, studentInput);
    if (!success) return;

    toast.success('입력이 저장되었습니다.');

    // 2초 후 AI 응답 시뮬레이션
    setTimeout(async () => {
      const mockAiResponse = `${studentInput}에 대한 AI 피드백: 좋은 아이디어네요! 더 구체적으로 설명해보시겠어요?`;
      setAiOutput(mockAiResponse);

      // 2단계: AI 응답 포함하여 저장
      await logAIResponse(currentActivity, turnIndex, studentInput, mockAiResponse);
      toast.success('AI 응답이 생성되었습니다.');

      // 3초 후 평가 시뮬레이션
      setTimeout(async () => {
        const mockEvaluation = {
          rubric: 'v1.0',
          score: Math.floor(Math.random() * 30) + 70, // 70-100점
          feedback: '창의적인 답변입니다.',
          criteria: {
            creativity: Math.floor(Math.random() * 3) + 3, // 3-5점
            clarity: Math.floor(Math.random() * 3) + 3,
            depth: Math.floor(Math.random() * 3) + 3
          }
        };

        // 3단계: 완전한 턴 저장 (평가 포함)
        await logComplete(currentActivity, turnIndex, studentInput, mockAiResponse, mockEvaluation);
        toast.success(`턴 ${turnIndex} 완료! 점수: ${mockEvaluation.score}점`);
      }, 3000);
    }, 2000);
  };

  const handleNextActivity = () => {
    if (currentActivity === 'writing.step1') {
      setCurrentActivity('writing.step2');
      setTurnIndex(1);
    } else if (currentActivity === 'writing.step2') {
      setCurrentActivity('discussion.step1');
      setTurnIndex(1);
    } else {
      setCurrentActivity('writing.step1');
      setTurnIndex(turnIndex + 1);
    }
    
    setStudentInput('');
    setAiOutput('');
    toast.info(`새 활동: ${currentActivity} (Turn ${turnIndex})`);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p>세션 정보를 확인하는 중...</p>
      </div>
    );
  }

  // 세션 종료 안내 화면
  if (sessionEnded) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ 
          backgroundColor: '#f8d7da', 
          border: '2px solid #dc3545', 
          borderRadius: '12px', 
          padding: '40px' 
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📚</div>
          <h1 style={{ fontSize: '28px', marginBottom: '20px', color: '#721c24' }}>
            세션이 종료되었습니다
          </h1>
          
          <div style={{ marginBottom: '30px', color: '#721c24', lineHeight: '1.6' }}>
            <p style={{ fontSize: '18px', marginBottom: '15px' }}>
              선생님이 이 학습 세션을 종료했습니다.
            </p>
            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.8)', 
              borderRadius: '8px', 
              padding: '20px',
              marginBottom: '20px'
            }}>
              <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                <strong>💡 안내사항:</strong>
              </p>
              <ul style={{ textAlign: 'left', fontSize: '14px', color: '#555' }}>
                <li>모든 학습 기록과 활동 데이터는 안전하게 저장되었습니다</li>
                <li>새로운 세션에 참여하려면 선생님께서 제공하는 새로운 코드가 필요합니다</li>
                <li>문의사항이 있으시면 선생님께 직접 연락해주세요</li>
              </ul>
            </div>
            <p style={{ fontSize: '14px', color: '#666' }}>
              수고하셨습니다! 😊
            </p>
          </div>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                // 세션 캐시 정리
                localStorage.clear();
                sessionStorage.clear();
                navigate('/student/join');
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              새 세션 참여하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 소크라테스식 모드인 경우 Proto4 iframe 렌더링
  if (isSocraticMode && sessionInfo) {
    const config = {
      runId: runId,
      studentName: studentName,
      activityToken: cachedSession?.activityToken,
      settings: sessionInfo.template.settings,
      // 추가 플랫폼 정보
      sessionName: sessionInfo.session?.id ? `세션 #${sessionInfo.session.id}` : '세션',
      templateName: sessionInfo.template.title,
      rejoinPin: cachedSession?.rejoinPin
    };
    
    const configParam = encodeURIComponent(JSON.stringify(config));
    const iframeUrl = `/proto4-chat.html?config=${configParam}`;
    
    return (
      <div style={{ 
        height: '100vh', 
        width: '100vw',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}>
        <iframe
          src={iframeUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            margin: 0,
            padding: 0
          }}
          title="소크라테스식 학습"
          onLoad={() => {
            console.log('Proto4 iframe loaded');
          }}
        />
        
        {/* iframe 메시지 처리는 useEffect로 이동 */}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '8px', 
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '10px', color: '#495057' }}>
              🎓 학습 세션
            </h1>
            <div style={{ fontSize: '16px', color: '#6c757d' }}>
              참여자: <strong>{studentName}</strong> | 세션 ID: {runId}
              {sessionInfo && (
                <span style={{ marginLeft: '10px' }}>
                  | 모드: <strong>{sessionInfo.template.mode_id}</strong>
                </span>
              )}
            </div>
          </div>
          
          {cachedSession?.rejoinPin && (
            <button
              onClick={handleShowPin}
              style={{
                padding: '8px 16px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🔐 재참여 PIN 확인
            </button>
          )}
        </div>
      </div>

      {/* 세션 상태 */}
      <div style={{ 
        backgroundColor: '#d4edda', 
        border: '1px solid #c3e6cb', 
        borderRadius: '8px', 
        padding: '15px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <span style={{ color: '#155724', fontSize: '16px', fontWeight: 'bold' }}>
          🟢 세션 활성 중
        </span>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#155724' }}>
          {isSocraticMode 
            ? '소크라테스식 학습 모드가 곧 시작됩니다...'
            : '학습 활동이 준비되면 여기에 표시됩니다.'
          }
        </p>
      </div>

      {/* 더미 활동 영역 */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #dee2e6', 
        borderRadius: '8px', 
        padding: '30px',
        marginBottom: '20px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#495057' }}>
            📝 더미 활동: {currentActivity}
          </h2>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            Turn {turnIndex} | 로깅 상태: {isLogging ? '저장 중...' : '대기'}
          </div>
        </div>

        {/* 학생 입력 영역 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
            학생 입력:
          </label>
          <textarea
            value={studentInput}
            onChange={(e) => setStudentInput(e.target.value)}
            placeholder="여기에 답변을 입력하세요..."
            disabled={isLogging}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* AI 응답 영역 */}
        {aiOutput && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
              AI 응답:
            </label>
            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {aiOutput}
            </div>
          </div>
        )}

        {/* 버튼 영역 */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleStudentSubmit}
            disabled={isLogging || !studentInput.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: isLogging || !studentInput.trim() ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLogging || !studentInput.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isLogging ? '저장 중...' : '답변 제출 (자동 저장)'}
          </button>

          <button
            onClick={handleNextActivity}
            disabled={isLogging}
            style={{
              padding: '12px 24px',
              backgroundColor: isLogging ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLogging ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            다음 활동
          </button>
        </div>

        {/* 안내 */}
        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '6px', 
          padding: '15px',
          marginTop: '20px',
          fontSize: '14px',
          color: '#856404'
        }}>
          💡 <strong>데모 기능:</strong> 답변 제출 시 자동으로 활동 로그가 저장됩니다.<br/>
          네트워크 탭에서 API 호출을 확인해보세요.
        </div>
      </div>

      {/* 하단 버튼 */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          onClick={handleBackToJoin}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          세션 선택으로 돌아가기
        </button>
      </div>

      {/* PIN 확인 모달 */}
      {showPinModal && cachedSession?.rejoinPin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            border: '2px solid #17a2b8'
          }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#495057' }}>
              🔐 재참여 PIN
            </h2>
            
            <div style={{
              backgroundColor: '#e3f2fd',
              border: '2px solid #2196f3',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{
                fontSize: '32px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: '#1976d2',
                letterSpacing: '8px',
                marginBottom: '10px'
              }}>
                {cachedSession.rejoinPin}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                브라우저를 닫거나 새로고침 시 이 PIN으로 재참여하세요
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => copyToClipboard(cachedSession.rejoinPin)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                📋 복사
              </button>
              
              <button
                onClick={() => setShowPinModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}