import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { templatesApi, runsApi } from '../utils/api';
import toast from 'react-hot-toast';

export default function SessionManage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template_id');
  
  const [template, setTemplate] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!templateId) {
      toast.error('템플릿 ID가 필요합니다.');
      navigate('/teacher');
      return;
    }
    loadData();
  }, [templateId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 템플릿 정보 로드
      const templateData = await templatesApi.get(templateId);
      setTemplate(templateData);
      
      // 특정 템플릿의 세션만 필터링하여 로드
      const sessionsData = await runsApi.list({ template_id: templateId });
      setSessions(sessionsData.runs || []);
      
    } catch (err) {
      console.error('데이터 로드 오류:', err);
      toast.error('데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('세션 이름을 입력해주세요.');
      return;
    }

    try {
      setCreating(true);
      console.log('세션 생성 시작:', { templateId, name: newSessionName });
      
      const runData = await runsApi.create(parseInt(templateId), newSessionName);
      console.log('세션 생성 성공:', runData);
      
      toast.success(`"${newSessionName}" 세션이 생성되었습니다!`);
      setNewSessionName('');
      setShowCreateForm(false);
      
      // 세션 목록 새로고침
      loadData();
      
    } catch (err) {
      console.error('세션 생성 오류:', err);
      toast.error('세션 생성에 실패했습니다: ' + (err.detail?.message || err.message));
    } finally {
      setCreating(false);
    }
  };

  const startSession = async (session) => {
    try {
      await runsApi.start(session.id);
      toast.success('세션이 시작되었습니다!');
      navigate(`/teacher/run/live?run_id=${session.id}`);
    } catch (err) {
      console.error('세션 시작 오류:', err);
      toast.error('세션 시작에 실패했습니다.');
    }
  };

  const goToLive = (session) => {
    navigate(`/teacher/run/live?run_id=${session.id}`);
  };

  const getStatusBadge = (status) => {
    const styles = {
      READY: { bg: '#fff3cd', color: '#856404', text: '⏸️ 준비됨' },
      LIVE: { bg: '#d4edda', color: '#155724', text: '🟢 진행 중' },
      ENDED: { bg: '#f8d7da', color: '#721c24', text: '⚫ 종료됨' }
    };
    
    const style = styles[status] || styles.READY;
    
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.color}`,
      }}>
        {style.text}
      </span>
    );
  };

  if (loading && !template) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>템플릿을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '20px' }}>
        {/* 경로 표시 */}
        <div style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
          대시보드 › 템플릿별 세션 관리
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '24px', margin: 0 }}>
            템플릿: {template.title}
          </h1>
          <button 
            onClick={() => navigate('/teacher')}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← 대시보드로 돌아가기
          </button>
        </div>
        
        <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
          모드: {template.mode_id} | 이 템플릿으로 생성된 모든 세션을 관리합니다
        </p>
      </div>

      {/* 새 세션 생성 */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>새 세션 생성</h2>
        
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ➕ 새 세션 만들기
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="세션 이름을 입력하세요..."
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minWidth: '200px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && createSession()}
            />
            <button
              onClick={createSession}
              disabled={creating}
              style={{
                padding: '8px 16px',
                backgroundColor: creating ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: creating ? 'not-allowed' : 'pointer'
              }}
            >
              {creating ? '생성 중...' : '생성'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewSessionName('');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              취소
            </button>
          </div>
        )}
      </div>

      {/* 세션 목록 */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>세션 목록</h2>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '새로고침 중...' : '🔄 새로고침'}
          </button>
        </div>

        {sessions.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
            아직 생성된 세션이 없습니다.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>세션 이름</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>상태</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>생성일시</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {session.name || `세션 #${session.id}`}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {getStatusBadge(session.status)}
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>
                      {new Date(session.created_at).toLocaleString('ko-KR', {
                        timeZone: 'Asia/Seoul',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {session.status === 'READY' && (
                        <button
                          onClick={() => startSession(session)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            marginRight: '5px'
                          }}
                        >
                          🚀 시작
                        </button>
                      )}
                      {(session.status === 'LIVE' || session.status === 'ENDED') && (
                        <button
                          onClick={() => goToLive(session)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: session.status === 'LIVE' ? '#007bff' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          📋 관리
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}