import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { runsApi } from '../utils/api';
import toast from 'react-hot-toast';

export default function RunLiveSimple() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('run_id');
  
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('LIVE');
  
  // 라이브 스냅샷 상태
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const [windowSec, setWindowSec] = useState(300); // 5분 기본값
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(10000); // 10초
  const [showEndModal, setShowEndModal] = useState(false);

  useEffect(() => {
    if (!runId) {
      toast.error('세션 ID가 필요합니다.');
      navigate('/teacher');
      return;
    }
    fetchSessionData();
  }, [runId]);

  // 라이브 스냅샷 폴링 useEffect
  useEffect(() => {
    if (!runId || !pollingEnabled || status !== 'LIVE') return;

    // 즉시 한 번 호출
    fetchLiveSnapshot();

    // 폴링 설정
    const interval = setInterval(() => {
      if (pollingEnabled && status === 'LIVE') {
        fetchLiveSnapshot();
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [runId, pollingEnabled, pollingInterval, windowSec, status]);

  // window 변경 시 즉시 새로고침
  useEffect(() => {
    if (runId && pollingEnabled && status === 'LIVE') {
      fetchLiveSnapshot();
    }
  }, [windowSec]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const codeData = await runsApi.getCode(runId);
      console.log('코드 조회 성공:', codeData);
      setJoinCode(codeData.code);
      setStatus('LIVE');
    } catch (err) {
      console.error('코드 조회 오류:', err);
      if (err.status === 400) {
        setStatus('ENDED');
        setPollingEnabled(false); // 폴링 중단
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveSnapshot = async () => {
    try {
      const response = await fetch(`/api/runs/${runId}/live-snapshot?window_sec=${windowSec}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLiveSnapshot(data);
        
        // ENDED 상태면 폴링 중단
        if (data.status === 'ENDED') {
          setPollingEnabled(false);
          setJoinCode('');
          setStatus('ENDED');
        }
      } else if (response.status === 410) {
        // 세션 종료됨
        setPollingEnabled(false);
        setJoinCode('');
        setStatus('ENDED');
        setLiveSnapshot(null);
      } else if (response.status === 429) {
        // 레이트리밋 - 폴링 간격 증가
        setPollingInterval(prev => Math.min(prev * 1.5, 30000));
        console.warn('Rate limit reached, increasing polling interval');
      } else {
        console.error('Live snapshot fetch failed:', response.status);
      }
    } catch (err) {
      console.error('Live snapshot network error:', err);
      // 네트워크 오류 시 폴링 간격 증가
      setPollingInterval(prev => Math.min(prev * 1.2, 30000));
    }
  };

  const copyCode = async () => {
    if (!joinCode) return;
    
    try {
      await navigator.clipboard.writeText(joinCode);
      toast.success('코드가 클립보드에 복사되었습니다!');
    } catch (err) {
      // 클립보드 API 폴백
      const textArea = document.createElement('textarea');
      textArea.value = joinCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('코드가 복사되었습니다!');
    }
  };

  const handleEndSessionClick = () => {
    setShowEndModal(true);
  };

  const handleEndSessionConfirm = async () => {
    try {
      setLoading(true);
      const response = await runsApi.end(runId);
      console.log('세션 종료 응답:', response);
      
      toast.success('세션이 종료되었습니다.');
      setJoinCode('');
      setStatus('ENDED');
      setPollingEnabled(false); // 폴링 중단
      setLiveSnapshot(null); // 스냅샷 초기화
      setShowEndModal(false);
    } catch (err) {
      console.error('세션 종료 오류:', err);
      toast.error('세션 종료에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSessionCancel = () => {
    setShowEndModal(false);
  };

  if (loading && !joinCode) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>세션 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 경로 표시 */}
      <div style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
        대시보드 › 템플릿별 세션 관리 › 개별 세션 관리
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>개별 세션 관리</h1>
        <button 
          onClick={() => window.history.back()}
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← 세션 목록으로 돌아가기
        </button>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>세션 상태</h2>
        
        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            padding: '8px 16px', 
            borderRadius: '20px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: status === 'LIVE' ? '#d4edda' : '#f8d7da',
            color: status === 'LIVE' ? '#155724' : '#721c24',
            border: `2px solid ${status === 'LIVE' ? '#c3e6cb' : '#f5c6cb'}`,
            display: 'inline-block'
          }}>
            {status === 'LIVE' ? '🟢 진행 중' : '⚫ 종료됨'}
          </span>
          
          <p style={{ color: '#666', marginTop: '12px', fontSize: '14px' }}>
            {status === 'LIVE' 
              ? '학생들이 참여할 수 있습니다' 
              : '세션이 종료되어 더 이상 참여할 수 없습니다'
            }
          </p>
        </div>
      </div>

      {status === 'LIVE' && joinCode ? (
        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>참여 코드</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'inline-block',
              backgroundColor: '#e3f2fd',
              border: '2px solid #2196f3',
              borderRadius: '8px',
              padding: '20px 40px'
            }}>
              <div style={{ 
                fontSize: '36px', 
                fontFamily: 'monospace', 
                fontWeight: 'bold',
                color: '#1976d2',
                letterSpacing: '8px'
              }}>
                {joinCode}
              </div>
            </div>
          </div>

          <button
            onClick={copyCode}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            📋 코드 복사
          </button>

          <div style={{ 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffc107',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
              💡 <strong>학생 안내:</strong> 학생들에게 이 6자리 코드를 알려주어 세션에 참여하도록 하세요.
            </p>
          </div>

          <div style={{ borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <button
              onClick={handleEndSessionClick}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: loading ? '#ccc' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '종료 중...' : '⛔ 세션 종료'}
            </button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              종료 후에는 학생들이 더 이상 참여할 수 없습니다
            </p>
          </div>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#666' }}>세션이 종료되었습니다</h2>
          <p style={{ color: '#666' }}>
            이 세션은 종료되어 더 이상 학생들이 참여할 수 없습니다.
          </p>
        </div>
      )}

      {/* 라이브 현황 (LIVE 상태일 때만 표시) */}
      {status === 'LIVE' && liveSnapshot && (
        <div>
          {/* 참여자 요약 정보 - 크게 표시 */}
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '18px', marginBottom: '20px', textAlign: 'center' }}>참여자 현황</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  backgroundColor: '#e3f2fd', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 10px'
                }}>
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>
                    {liveSnapshot.joined_total}
                  </span>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', margin: 0 }}>총 참여자</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  backgroundColor: '#e8f5e8', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 10px'
                }}>
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#4caf50' }}>
                    {liveSnapshot.active_recent}
                  </span>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', margin: 0 }}>
                  활성 참여자
                  <br />
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    (최근 {windowSec >= 60 ? `${Math.floor(windowSec / 60)}분` : `${windowSec}초`})
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* 참여자 목록 */}
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '20px',
            marginBottom: '20px'
          }}>
            {/* 헤더 및 설정 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>참여자 목록</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label htmlFor="window-select" style={{ fontSize: '13px', color: '#666' }}>활성 기준:</label>
                  <select
                    id="window-select"
                    value={windowSec}
                    onChange={(e) => setWindowSec(parseInt(e.target.value))}
                    style={{ 
                      fontSize: '12px', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px', 
                      padding: '4px 8px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value={300}>5분</option>
                    <option value={900}>15분</option>
                    <option value={3600}>1시간</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: pollingEnabled ? '#4caf50' : '#f44336' 
                  }}></div>
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    {pollingEnabled ? `${pollingInterval/1000}초마다 갱신` : '갱신 중단'}
                  </span>
                </div>
              </div>
            </div>

            {/* 참여자 테이블 */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      color: '#666', 
                      borderBottom: '2px solid #ddd'
                    }}>
                      참여자 이름
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      color: '#666', 
                      borderBottom: '2px solid #ddd'
                    }}>
                      최근 활동 시간
                    </th>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'center', 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      color: '#666', 
                      borderBottom: '2px solid #ddd'
                    }}>
                      턴 수
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {liveSnapshot.students.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ 
                        padding: '20px', 
                        textAlign: 'center', 
                        color: '#666',
                        fontSize: '14px'
                      }}>
                        아직 참여한 학생이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    liveSnapshot.students.map((student, index) => {
                      // 서버에서 받은 시간을 로컬 시간으로 해석
                      const lastSeenDate = student.last_seen_at ? new Date(student.last_seen_at) : null;
                      const now = new Date();
                      const diffMs = lastSeenDate ? now - lastSeenDate : Infinity;
                      const isActive = diffMs <= windowSec * 1000;
                      
                      const formatTimeAgo = (ms) => {
                        if (ms < 60000) return '방금 전';
                        if (ms < 3600000) return `${Math.floor(ms / 60000)}분 전`;
                        if (ms < 86400000) return `${Math.floor(ms / 3600000)}시간 전`;
                        return `${Math.floor(ms / 86400000)}일 전`;
                      };

                      return (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                backgroundColor: isActive ? '#4caf50' : '#ccc' 
                              }}></div>
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>
                                {student.student_name}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                            {lastSeenDate ? formatTimeAgo(diffMs) : '-'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#333', textAlign: 'center', fontWeight: '500' }}>
                            {student.turns_total}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 세션 종료 확인 모달 */}
      {showEndModal && (
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
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            border: '2px solid #dc3545'
          }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#dc3545' }}>
              ⚠️ 세션 종료 확인
            </h2>
            
            <div style={{ marginBottom: '25px', lineHeight: '1.6', color: '#555' }}>
              <p style={{ marginBottom: '15px', fontSize: '16px' }}>
                <strong>정말로 이 세션을 종료하시겠습니까?</strong>
              </p>
              <div style={{ 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffc107', 
                borderRadius: '6px', 
                padding: '15px',
                marginBottom: '15px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
                  <strong>⚠️ 주의사항:</strong>
                </p>
                <ul style={{ margin: '10px 0 0 0', textAlign: 'left', fontSize: '14px', color: '#856404' }}>
                  <li>세션 종료 후에는 학생들이 더 이상 참여할 수 없습니다</li>
                  <li>진행 중인 학습 활동이 중단됩니다</li>
                  <li>종료된 세션은 다시 시작할 수 없습니다</li>
                  <li>모든 활동 데이터는 보존됩니다</li>
                </ul>
              </div>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                종료하시려면 <strong>"종료"</strong> 버튼을 클릭해주세요.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={handleEndSessionCancel}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                취소
              </button>
              
              <button
                onClick={handleEndSessionConfirm}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: loading ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '종료 중...' : '⛔ 종료'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}