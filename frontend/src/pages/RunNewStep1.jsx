import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { templatesApi, runsApi } from '../utils/api';
import toast from 'react-hot-toast';

export default function RunNewStep1() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template_id');
  
  const [template, setTemplate] = useState(null);
  const [sessionRun, setSessionRun] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!templateId) {
      toast.error('템플릿 ID가 필요합니다.');
      navigate('/teacher');
      return;
    }
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const data = await templatesApi.get(templateId);
      setTemplate(data);
    } catch (err) {
      console.error('템플릿 조회 오류:', err);
      toast.error('템플릿을 불러올 수 없습니다.');
      navigate('/teacher');
    } finally {
      setLoading(false);
    }
  };

  const createRun = async () => {
    try {
      setLoading(true);
      console.log('세션 생성 시작, 템플릿 ID:', templateId);
      
      const runData = await runsApi.create(parseInt(templateId));
      console.log('세션 생성 성공:', runData);
      
      setSessionRun(runData);
      toast.success('세션이 생성되었습니다!');
    } catch (err) {
      console.error('세션 생성 오류:', err);
      toast.error('세션 생성에 실패했습니다: ' + (err.detail?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const startRun = async () => {
    if (!sessionRun) {
      toast.error('먼저 세션을 생성해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      console.log('세션 시작, Run ID:', sessionRun.id);
      
      await runsApi.start(sessionRun.id);
      toast.success('세션이 시작되었습니다!');
      
      // 라이브 페이지로 이동
      navigate(`/teacher/run/live?run_id=${sessionRun.id}`);
    } catch (err) {
      console.error('세션 시작 오류:', err);
      toast.error('세션 시작에 실패했습니다: ' + (err.detail?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>템플릿 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>템플릿을 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>새 세션 만들기</h1>
      
      <button 
        onClick={() => navigate('/teacher')}
        style={{ 
          padding: '8px 16px', 
          marginBottom: '20px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ← 돌아가기
      </button>

      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>템플릿 정보</h2>
        
        <div style={{ marginBottom: '12px' }}>
          <strong>제목:</strong> {template.title}
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <strong>모드:</strong> {template.mode_id}
        </div>
        
        <div>
          <strong>설정:</strong>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto'
          }}>
            {JSON.stringify(template.settings_json, null, 2)}
          </pre>
        </div>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px',
        textAlign: 'center'
      }}>
        {!sessionRun ? (
          /* 세션 생성 단계 */
          <>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>세션 생성하기</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              이 템플릿으로 새로운 세션을 생성하여 학생들이 참여할 수 있도록 준비합니다.
            </p>
            
            <button
              onClick={createRun}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '생성 중...' : '세션 생성'}
            </button>
          </>
        ) : (
          /* 세션 시작 단계 */
          <>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#28a745' }}>
              ✅ 세션이 생성되었습니다!
            </h3>
            <p style={{ color: '#666', marginBottom: '8px' }}>
              세션 ID: <span style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>{sessionRun.id}</span>
            </p>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              이제 세션을 시작하여 학생들이 참여할 수 있는 6자리 코드를 받으세요.
            </p>
            
            <button
              onClick={startRun}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '10px'
              }}
            >
              {loading ? '시작 중...' : '🚀 세션 시작하기'}
            </button>
            
            <div>
              <button
                onClick={() => navigate('/teacher')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                나중에 시작하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}