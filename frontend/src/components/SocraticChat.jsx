/**
 * Socratic Chat Component - Proto4 기반 소크라테스식 대화 인터페이스
 */
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export default function SocraticChat({ 
  settings, 
  runId, 
  studentName, 
  activityToken,
  onActivityLog 
}) {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [understandingScore, setUnderstandingScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [turnIndex, setTurnIndex] = useState(1);
  
  const messagesEndRef = useRef(null);

  const { topic, difficulty = 'normal', score_display = 'show' } = settings;
  const showScore = score_display === 'show';

  // Proto4 API 기본 URL
  const PROTO4_API_BASE = 'http://localhost:3001/api/v1';

  // 스크롤을 맨 아래로
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 초기 메시지 로드
  const loadInitialMessage = async () => {
    try {
      setInitialLoading(true);
      
      const response = await fetch(`${PROTO4_API_BASE}/chat/initial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          difficulty: difficulty
        })
      });
      
      if (!response.ok) {
        throw new Error('초기 메시지 로드 실패');
      }
      
      const data = await response.json();
      
      // AI 첫 메시지 추가
      const initialMessage = {
        role: 'ai',
        content: data.initial_message,
        timestamp: new Date()
      };
      
      setMessages([initialMessage]);
      
      // 활동 로그 저장 (초기 메시지)
      if (onActivityLog) {
        await onActivityLog({
          activity_key: 'socratic_chat',
          turn_index: 0,
          student_input: null,
          ai_output: data.initial_message,
          third_eval_json: { initial: true, understanding_score: 0 }
        });
      }
      
    } catch (error) {
      console.error('초기 메시지 로드 오류:', error);
      toast.error('학습 환경 준비 중 오류가 발생했습니다.');
      
      // 폴백 메시지
      setMessages([{
        role: 'ai',
        content: `안녕하세요! "${topic}"에 대해 함께 탐구해보겠습니다. 먼저 이 주제에 대해 어떤 생각을 가지고 계신지 말씀해 주세요.`,
        timestamp: new Date()
      }]);
    } finally {
      setInitialLoading(false);
    }
  };

  // 메시지 전송
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!currentMessage.trim() || isLoading) return;
    
    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    
    // 사용자 메시지 추가
    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    try {
      // Proto4 API로 소크라테스식 응답 요청
      const response = await fetch(`${PROTO4_API_BASE}/chat/socratic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          messages: [...messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })), 
                     { role: 'user', content: userMessage }],
          understanding_level: understandingScore,
          difficulty: difficulty
        })
      });
      
      if (!response.ok) {
        throw new Error('AI 응답 요청 실패');
      }
      
      const data = await response.json();
      
      // AI 응답 메시지 추가
      const aiMsg = {
        role: 'ai',
        content: data.socratic_response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMsg]);
      
      // 점수 업데이트 (표시 모드인 경우에만)
      if (showScore) {
        setUnderstandingScore(data.understanding_score);
        setIsCompleted(data.is_completed);
      }
      
      // 활동 로그 저장
      if (onActivityLog) {
        await onActivityLog({
          activity_key: 'socratic_chat',
          turn_index: turnIndex,
          student_input: userMessage,
          ai_output: data.socratic_response,
          third_eval_json: {
            understanding_score: data.understanding_score,
            is_completed: data.is_completed,
            dimensions: data.dimensions,
            insights: data.insights,
            growth_indicators: data.growth_indicators,
            next_focus: data.next_focus
          }
        });
      }
      
      setTurnIndex(prev => prev + 1);
      
      // 완료 상태 체크
      if (data.is_completed && !isCompleted) {
        setTimeout(() => {
          toast.success('🎉 완벽한 이해에 도달했습니다! 축하해요!');
        }, 1000);
        setIsCompleted(true);
      }
      
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      toast.error('메시지 전송 중 오류가 발생했습니다.');
      
      // 오류 시 폴백 응답
      const fallbackMsg = {
        role: 'ai',
        content: '죄송해요, 일시적인 문제가 발생했습니다. 조금 전 답변을 다시 말씀해 주시거나, 다른 방식으로 접근해 보세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // 진행률 피드백 텍스트
  const getProgressFeedback = (score) => {
    if (score <= 20) return "탐구 시작: 이제 막 탐구를 시작했어요! 함께 알아가봐요 🌱";
    if (score <= 40) return "기초 이해: 기본적인 이해가 생겼어요! 더 깊이 들어가볼까요? 💡";
    if (score <= 60) return "초급 수준: 개념을 잘 이해하고 있어요! 연결고리를 찾아보세요 🔗";
    if (score <= 80) return "중급 수준: 훌륭한 이해력이에요! 비판적 사고를 시작해보세요 🧠";
    if (score < 100) return "고급 수준: 전문가 수준의 깊은 이해를 보여주고 있어요! 🌟";
    return "마스터 완성: 완벽한 이해를 달성했습니다! 🏆";
  };

  // 컴포넌트 마운트 시 초기 메시지 로드
  useEffect(() => {
    loadInitialMessage();
  }, [topic, difficulty]);

  // 메시지 추가 시 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (initialLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        margin: '20px'
      }}>
        <div style={{ 
          fontSize: '24px', 
          marginBottom: '10px',
          animation: 'pulse 2s infinite'
        }}>
          🏛️
        </div>
        <p>소크라테스 튜터가 첫 질문을 준비하고 있습니다...</p>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginTop: '10px'
        }}></div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '80vh',
      maxWidth: '1000px',
      margin: '0 auto',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '20px',
        backgroundColor: '#4a90e2',
        color: 'white',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>
          🏛️ {topic}
        </h2>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
          소크라테스식 대화 학습 • 난이도: {
            difficulty === 'easy' ? '🌱 쉬움' : 
            difficulty === 'normal' ? '📚 보통' : '🎓 어려움'
          }
        </p>
      </div>

      {/* 진행률 표시 (점수 보기 모드일 때만) */}
      {showScore && (
        <div style={{
          padding: '15px 20px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>이해도 진행률</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a90e2' }}>
              {understandingScore}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            marginTop: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${understandingScore}%`,
              height: '100%',
              backgroundColor: understandingScore >= 80 ? '#28a745' : 
                              understandingScore >= 60 ? '#ffc107' : '#6c757d',
              borderRadius: '4px',
              transition: 'width 0.5s ease'
            }}></div>
          </div>
          <p style={{ 
            margin: '8px 0 0 0', 
            fontSize: '12px', 
            color: '#6c757d',
            fontStyle: 'italic'
          }}>
            {getProgressFeedback(understandingScore)}
          </p>
        </div>
      )}

      {/* 메시지 영역 */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        backgroundColor: '#ffffff'
      }}>
        {messages.map((message, index) => (
          <div key={index} style={{
            display: 'flex',
            marginBottom: '16px',
            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: '18px',
              backgroundColor: message.role === 'user' ? '#007bff' : '#f1f3f4',
              color: message.role === 'user' ? 'white' : '#333',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}>
              {message.role === 'ai' && (
                <div style={{ 
                  fontSize: '12px', 
                  opacity: 0.7, 
                  marginBottom: '4px',
                  fontWeight: 'bold'
                }}>
                  🏛️ 소크라테스 튜터
                </div>
              )}
              <div style={{ 
                lineHeight: '1.4',
                whiteSpace: 'pre-wrap'
              }}>
                {message.content}
              </div>
              <div style={{
                fontSize: '10px',
                opacity: 0.6,
                marginTop: '4px',
                textAlign: message.role === 'user' ? 'right' : 'left'
              }}>
                {message.timestamp.toLocaleTimeString('ko-KR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '16px'
          }}>
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: '18px',
              backgroundColor: '#f1f3f4',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{ 
                fontSize: '12px', 
                marginRight: '8px',
                fontWeight: 'bold'
              }}>
                🏛️ 소크라테스 튜터
              </div>
              <div style={{
                display: 'flex',
                gap: '4px'
              }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#6c757d',
                    animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
                  }}></div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
        
        <style>
          {`
            @keyframes bounce {
              0%, 80%, 100% { 
                transform: scale(0);
                opacity: 0.5;
              } 
              40% { 
                transform: scale(1);
                opacity: 1;
              }
            }
          `}
        </style>
      </div>

      {/* 입력 영역 */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid #e9ecef',
        backgroundColor: '#f8f9fa'
      }}>
        <form onSubmit={sendMessage} style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          <textarea
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="생각을 자유롭게 입력해주세요..."
            disabled={isLoading || isCompleted}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            style={{
              flex: 1,
              minHeight: '80px',
              maxHeight: '120px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              backgroundColor: isLoading || isCompleted ? '#f5f5f5' : 'white'
            }}
          />
          <button
            type="submit"
            disabled={!currentMessage.trim() || isLoading || isCompleted}
            style={{
              padding: '12px 20px',
              backgroundColor: isLoading || isCompleted ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: isLoading || isCompleted ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              minWidth: '80px'
            }}
          >
            {isLoading ? '전송 중...' : isCompleted ? '완료' : '📤 전송'}
          </button>
        </form>
        
        {isCompleted && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #c3e6cb'
          }}>
            🎉 <strong>축하합니다!</strong> 완벽한 이해에 도달했습니다! 계속해서 더 깊이 탐구해보세요.
          </div>
        )}
        
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#6c757d',
          textAlign: 'center'
        }}>
          💡 팁: Shift + Enter로 줄바꿈, Enter로 전송
        </div>
      </div>
    </div>
  );
}