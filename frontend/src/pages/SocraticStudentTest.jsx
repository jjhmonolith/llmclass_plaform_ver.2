/**
 * Socratic Student 테스트 페이지 (임시 검수용)
 */
import { useState, useEffect } from 'react';
import SocraticChat from '../components/SocraticChat';
import toast from 'react-hot-toast';

export default function SocraticStudentTest() {
  const [testSettings, setTestSettings] = useState({
    topic: '지구 온난화의 원인과 해결 방안',
    difficulty: 'normal',
    score_display: 'show',
    content_type: 'text'
  });

  const [mockSession] = useState({
    runId: 999,
    studentName: '테스트학생',
    activityToken: 'mock-token-for-testing'
  });

  const [apiTestResults, setApiTestResults] = useState({});

  // 모의 활동 로깅 함수
  const mockActivityLogger = async (data) => {
    console.log('Mock Activity Log:', data);
    toast.success(`활동 로그 저장됨: Turn ${data.turn_index}`);
    
    // 실제 백엔드 호출 시뮬레이션 (선택사항)
    try {
      // 실제로 백엔드에 저장해보고 싶다면 주석 해제
      /*
      const response = await fetch('/api/activity-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockSession.activityToken}`
        },
        body: JSON.stringify({
          ...data,
          // 테스트용 추가 필드
          _test_mode: true
        })
      });
      
      if (response.ok) {
        console.log('실제 백엔드에도 저장 성공');
      }
      */
    } catch (error) {
      console.log('실제 백엔드 저장은 건너뛰기:', error.message);
    }
    
    return true;
  };

  // Proto4 API 연결 테스트
  const testProto4APIs = async () => {
    const results = {};
    
    // 1. 주제 검증 테스트
    try {
      const validateResponse = await fetch('http://localhost:3001/api/v1/topic/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_content: testSettings.topic,
          content_type: 'text'
        })
      });
      results.validate = await validateResponse.json();
      results.validateStatus = validateResponse.status;
    } catch (error) {
      results.validate = { error: error.message };
      results.validateStatus = 'ERROR';
    }

    // 2. 초기 메시지 테스트
    try {
      const initialResponse = await fetch('http://localhost:3001/api/v1/chat/initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: testSettings.topic,
          difficulty: testSettings.difficulty
        })
      });
      results.initial = await initialResponse.json();
      results.initialStatus = initialResponse.status;
    } catch (error) {
      results.initial = { error: error.message };
      results.initialStatus = 'ERROR';
    }

    setApiTestResults(results);
    
    if (results.validateStatus === 200 && results.initialStatus === 200) {
      toast.success('Proto4 API 연결 성공!');
    } else {
      toast.error('Proto4 API 연결 실패');
    }
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 API 테스트 실행
    testProto4APIs();
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f2f5',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 테스트 헤더 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h1>🧪 Socratic Student Interface 테스트</h1>
          <p>Proto4 연동 3단계 검수용 - 학생 채팅 인터페이스 테스트 페이지입니다.</p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '15px',
            marginTop: '15px'
          }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                학습 주제:
              </label>
              <input
                type="text"
                value={testSettings.topic}
                onChange={(e) => setTestSettings({...testSettings, topic: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                난이도:
              </label>
              <select
                value={testSettings.difficulty}
                onChange={(e) => setTestSettings({...testSettings, difficulty: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px'
                }}
              >
                <option value="easy">🌱 쉬움</option>
                <option value="normal">📚 보통</option>
                <option value="hard">🎓 어려움</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                점수 표시:
              </label>
              <select
                value={testSettings.score_display}
                onChange={(e) => setTestSettings({...testSettings, score_display: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px'
                }}
              >
                <option value="show">📊 점수 보기</option>
                <option value="hide">🎯 점수 숨김</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={testProto4APIs}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Proto4 API 재테스트
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 채팅 인터페이스 리셋
            </button>
          </div>
        </div>

        {/* API 테스트 결과 */}
        {Object.keys(apiTestResults).length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3>🔗 Proto4 API 테스트 결과</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4 style={{ color: apiTestResults.validateStatus === 200 ? '#28a745' : '#dc3545' }}>
                  1. 주제 검증 API ({apiTestResults.validateStatus})
                </h4>
                <pre style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '10px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '150px'
                }}>
                  {JSON.stringify(apiTestResults.validate, null, 2)}
                </pre>
              </div>

              <div>
                <h4 style={{ color: apiTestResults.initialStatus === 200 ? '#28a745' : '#dc3545' }}>
                  2. 초기 메시지 API ({apiTestResults.initialStatus})
                </h4>
                <pre style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '10px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '150px'
                }}>
                  {JSON.stringify(apiTestResults.initial, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* 메인 채팅 인터페이스 */}
        <div>
          <SocraticChat
            settings={testSettings}
            runId={mockSession.runId}
            studentName={mockSession.studentName}
            activityToken={mockSession.activityToken}
            onActivityLog={mockActivityLogger}
          />
        </div>

        {/* 검수 가이드 */}
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px'
        }}>
          <h3>💡 검수 방법</h3>
          <ol>
            <li><strong>Proto4 API 연결 확인</strong>: 위의 API 테스트 결과에서 모든 상태가 200인지 확인</li>
            <li><strong>초기 메시지 로드</strong>: 채팅창에 소크라테스 튜터의 첫 질문이 나타나는지 확인</li>
            <li><strong>대화 테스트</strong>: 간단한 답변을 입력하고 AI 응답이 돌아오는지 확인</li>
            <li><strong>점수 시스템</strong>: 점수 표시 모드에서 이해도 진행률이 업데이트되는지 확인</li>
            <li><strong>활동 로깅</strong>: 브라우저 콘솔에서 'Mock Activity Log' 메시지 확인</li>
            <li><strong>설정 변경</strong>: 위의 설정을 바꾸고 페이지 새로고침 후 다른 동작 확인</li>
          </ol>
          
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <strong>참고:</strong> 이 페이지는 실제 학생 세션과 독립적으로 작동하는 테스트 환경입니다.
            실제 통합 테스트를 위해서는 교사가 소크라테스식 템플릿으로 세션을 생성한 후 학생이 참여해야 합니다.
          </div>
        </div>
      </div>
    </div>
  );
}