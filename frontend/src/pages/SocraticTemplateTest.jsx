/**
 * Socratic 템플릿 테스트 페이지 (임시 검수용)
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function SocraticTemplateTest() {
  const [modes, setModes] = useState([]);
  const [socraticMode, setSocraticMode] = useState(null);
  const [templateData, setTemplateData] = useState({
    title: '',
    topic: '',
    content_type: 'text',
    difficulty: 'normal',
    score_display: 'show'
  });

  // 모드 데이터 가져오기
  const fetchModes = async () => {
    try {
      const response = await fetch('/api/modes/');
      if (!response.ok) throw new Error('모드 조회 실패');
      const modesList = await response.json();
      setModes(modesList);
      
      // socratic 모드 찾기
      const socratic = modesList.find(m => m.id === 'socratic');
      if (socratic) {
        setSocraticMode(socratic);
        console.log('Socratic 모드 옵션 스키마:', socratic.options_schema);
      }
    } catch (error) {
      toast.error('모드 조회 실패: ' + error.message);
    }
  };

  // 템플릿 생성 테스트
  const createTemplate = async () => {
    try {
      const payload = {
        mode_id: 'socratic',
        title: templateData.title,
        settings_json: {
          topic: templateData.topic,
          content_type: templateData.content_type,
          difficulty: templateData.difficulty,
          score_display: templateData.score_display
        }
      };
      
      console.log('템플릿 생성 요청:', payload);
      
      const response = await fetch('/api/templates/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 임시로 교사 ID 하드코딩 (실제로는 로그인된 사용자 정보 사용)
          'Authorization': 'Bearer fake-token'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '템플릿 생성 실패');
      }
      
      const result = await response.json();
      toast.success('템플릿 생성 성공!');
      console.log('생성된 템플릿:', result);
    } catch (error) {
      toast.error('템플릿 생성 실패: ' + error.message);
      console.error('템플릿 생성 오류:', error);
    }
  };

  useEffect(() => {
    fetchModes();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1>🧪 Socratic 템플릿 테스트</h1>
      <p>Proto4 연동 2단계 검수용 임시 페이지입니다.</p>
      
      {/* 모드 정보 표시 */}
      {socraticMode && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <h2>📊 Socratic 모드 정보</h2>
          <p><strong>ID:</strong> {socraticMode.id}</p>
          <p><strong>이름:</strong> {socraticMode.name}</p>
          <p><strong>버전:</strong> {socraticMode.version}</p>
          
          <h3>옵션 스키마:</h3>
          <pre style={{ 
            backgroundColor: '#f8f8f8', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {JSON.stringify(socraticMode.options_schema, null, 2)}
          </pre>
        </div>
      )}

      {/* 템플릿 생성 폼 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h2>📝 템플릿 생성 테스트</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            템플릿 제목:
          </label>
          <input
            type="text"
            value={templateData.title}
            onChange={(e) => setTemplateData({...templateData, title: e.target.value})}
            placeholder="예: 중2-과학-지구온난화"
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            학습 주제:
          </label>
          <textarea
            value={templateData.topic}
            onChange={(e) => setTemplateData({...templateData, topic: e.target.value})}
            placeholder="예: 지구 온난화의 원인과 해결 방안"
            rows={3}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            난이도:
          </label>
          <select
            value={templateData.difficulty}
            onChange={(e) => setTemplateData({...templateData, difficulty: e.target.value})}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px'
            }}
          >
            <option value="easy">🌱 쉬움 (기본 개념 위주)</option>
            <option value="normal">📚 보통 (중학생 수준)</option>
            <option value="hard">🎓 어려움 (깊이 있는 탐구)</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            점수 표시:
          </label>
          <select
            value={templateData.score_display}
            onChange={(e) => setTemplateData({...templateData, score_display: e.target.value})}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px'
            }}
          >
            <option value="show">📊 점수 보기 (실시간 진행률과 동기부여)</option>
            <option value="hide">🎯 점수 숨김 (순수한 탐구에 집중)</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            입력 방식:
          </label>
          <select
            value={templateData.content_type}
            onChange={(e) => setTemplateData({...templateData, content_type: e.target.value})}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px'
            }}
          >
            <option value="text">📝 텍스트 (현재 지원)</option>
            <option value="pdf" disabled>📄 PDF (준비 중)</option>
            <option value="url" disabled>🔗 링크 (준비 중)</option>
          </select>
        </div>

        <button
          onClick={createTemplate}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            width: '100%'
          }}
        >
          🎯 Socratic 템플릿 생성하기
        </button>
      </div>

      {/* API 테스트 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #ddd'
      }}>
        <h2>🔗 Proto4 API 테스트</h2>
        <p>Proto4 백엔드 (3001포트) 연결 테스트</p>
        
        <button
          onClick={async () => {
            try {
              const response = await fetch('http://localhost:3001/api/v1/topic/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  topic_content: templateData.topic || "테스트 주제",
                  content_type: "text"
                })
              });
              const result = await response.json();
              toast.success('Proto4 API 연결 성공!');
              console.log('Proto4 응답:', result);
            } catch (error) {
              toast.error('Proto4 API 연결 실패: ' + error.message);
            }
          }}
          style={{
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🧪 Proto4 주제 검증 테스트
        </button>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>💡 검수 방법:</p>
        <ul>
          <li>1. 위에서 Socratic 모드 정보가 정상적으로 표시되는지 확인</li>
          <li>2. 템플릿 생성 폼에서 값을 입력하고 생성 버튼 클릭</li>
          <li>3. 브라우저 개발자 도구 콘솔에서 요청/응답 데이터 확인</li>
          <li>4. Proto4 API 테스트 버튼으로 3001포트 연결 확인</li>
        </ul>
      </div>
    </div>
  );
}