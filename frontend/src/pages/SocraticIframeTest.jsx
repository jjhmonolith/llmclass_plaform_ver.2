/**
 * Socratic iframe 테스트 페이지 - Proto4 원본 UI 사용
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function SocraticIframeTest() {
  const [config, setConfig] = useState({
    runId: 999,
    studentName: '테스트학생',
    activityToken: 'test-token-123',
    settings: {
      topic: '지구 온난화의 원인과 해결 방안',
      difficulty: 'normal',
      score_display: 'show',
      content_type: 'text'
    },
    sessionName: '테스트 세션',
    templateName: '소크라테스 테스트 템플릿',
    rejoinPin: '1234'
  });

  const [iframeUrl, setIframeUrl] = useState('');
  const [messages, setMessages] = useState([]);

  // iframe URL 생성
  const generateIframeUrl = () => {
    const configParam = encodeURIComponent(JSON.stringify(config));
    const url = `/proto4-chat.html?config=${configParam}`;
    setIframeUrl(url);
    return url;
  };

  // iframe 메시지 핸들러
  const handleIframeMessage = (event) => {
    if (event.data.source === 'proto4-chat') {
      const message = {
        timestamp: new Date(),
        type: event.data.type,
        data: event.data.data
      };
      
      setMessages(prev => [...prev, message]);
      
      switch (event.data.type) {
        case 'exit_to_new_session':
          toast.info('🚪 새 세션 참여 요청됨');
          break;
        case 'session_ended':
          toast.error('📚 세션 종료됨');
          break;
        case 'navigate_back':
          toast.info('Proto4에서 뒤로가기 요청됨');
          break;
        case 'error':
          toast.error(`Proto4 오류: ${event.data.data.message}`);
          break;
        case 'learning_completed':
          toast.success(`🎉 학습 완료! 점수: ${event.data.data.understanding_score}%`);
          break;
        case 'initial_message_loaded':
          toast.success('초기 메시지 로드 완료');
          break;
        case 'conversation_progress':
          toast.info(`대화 진행: Turn ${event.data.data.turn}, 점수: ${event.data.data.understanding_score}%`);
          break;
      }
    }
  };

  // 컴포넌트 마운트 시
  useEffect(() => {
    generateIframeUrl();
    
    // 메시지 리스너 등록
    window.addEventListener('message', handleIframeMessage);
    
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, []);

  // 설정 변경 시 URL 재생성
  useEffect(() => {
    generateIframeUrl();
  }, [config]);

  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      if (path.includes('.')) {
        const [parent, child] = path.split('.');
        newConfig[parent] = { ...newConfig[parent], [child]: value };
      } else {
        newConfig[path] = value;
      }
      return newConfig;
    });
  };

  const reloadIframe = () => {
    const iframe = document.getElementById('proto4-iframe');
    if (iframe) {
      iframe.src = iframe.src; // 강제 새로고침
    }
    setMessages([]);
    toast.info('iframe 새로고침됨');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 상단 컨트롤 패널 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderBottom: '1px solid #dee2e6',
        flexShrink: 0
      }}>
        <h1 style={{ margin: '0 0 15px 0', fontSize: '20px' }}>
          🧪 Proto4 iframe 테스트 (원본 UI 사용)
        </h1>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '10px',
          marginBottom: '15px'
        }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>학습 주제:</label>
            <input
              type="text"
              value={config.settings.topic}
              onChange={(e) => updateConfig('settings.topic', e.target.value)}
              style={{ width: '100%', padding: '4px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>학생 이름:</label>
            <input
              type="text"
              value={config.studentName}
              onChange={(e) => updateConfig('studentName', e.target.value)}
              style={{ width: '100%', padding: '4px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>난이도:</label>
            <select
              value={config.settings.difficulty}
              onChange={(e) => updateConfig('settings.difficulty', e.target.value)}
              style={{ width: '100%', padding: '4px', fontSize: '12px' }}
            >
              <option value="easy">쉬움</option>
              <option value="normal">보통</option>
              <option value="hard">어려움</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>점수 표시:</label>
            <select
              value={config.settings.score_display}
              onChange={(e) => updateConfig('settings.score_display', e.target.value)}
              style={{ width: '100%', padding: '4px', fontSize: '12px' }}
            >
              <option value="show">점수 보기</option>
              <option value="hide">점수 숨김</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reloadIframe}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🔄 새로고침
          </button>

          <span style={{ fontSize: '11px', color: '#666' }}>
            메시지: {messages.length}개 | 
            최근: {messages.length > 0 ? messages[messages.length - 1].type : 'None'}
          </span>

          {/* 메시지 로그 토글 */}
          <details style={{ fontSize: '11px', maxWidth: '300px' }}>
            <summary style={{ cursor: 'pointer', color: '#007bff' }}>
              📋 메시지 로그 보기
            </summary>
            <div style={{ 
              maxHeight: '150px', 
              overflowY: 'auto', 
              backgroundColor: '#f1f3f4',
              padding: '8px',
              marginTop: '5px',
              borderRadius: '4px'
            }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ 
                  fontSize: '10px', 
                  marginBottom: '4px',
                  paddingBottom: '4px',
                  borderBottom: '1px solid #ccc'
                }}>
                  <strong>{msg.type}:</strong> {JSON.stringify(msg.data)}
                  <br />
                  <span style={{ color: '#666' }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* Proto4 iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          id="proto4-iframe"
          src={iframeUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          title="Proto4 소크라테스식 학습"
          onLoad={() => {
            console.log('Proto4 iframe loaded with config:', config);
            toast.success('Proto4 iframe 로드 완료');
          }}
        />
      </div>

      {/* 하단 정보 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '8px 15px',
        borderTop: '1px solid #dee2e6',
        fontSize: '11px',
        color: '#666',
        flexShrink: 0
      }}>
        <strong>💡 사용법:</strong> 
        위의 설정을 변경하면 자동으로 iframe이 업데이트됩니다. 
        Proto4의 모든 UI 요소(5차원 평가, 성장 지표, 진행률 등)가 원본 그대로 작동합니다.
        | <strong>iframe URL:</strong> <code style={{ fontSize: '10px' }}>{iframeUrl}</code>
      </div>
    </div>
  );
}