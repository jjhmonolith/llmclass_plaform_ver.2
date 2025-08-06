import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { runsApi } from '../utils/api';
import toast from 'react-hot-toast';

export default function RunLive() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('run_id');
  
  const [sessionRun, setSessionRun] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 라이브 스냅샷 상태
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const [windowSec, setWindowSec] = useState(300); // 5분 기본값
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(10000); // 10초

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
    if (!runId || !pollingEnabled) return;

    // 즉시 한 번 호출
    fetchLiveSnapshot();

    // 폴링 설정
    const interval = setInterval(() => {
      if (pollingEnabled) {
        fetchLiveSnapshot();
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [runId, pollingEnabled, pollingInterval, windowSec]);

  // window 변경 시 즉시 새로고침
  useEffect(() => {
    if (runId && pollingEnabled) {
      fetchLiveSnapshot();
    }
  }, [windowSec]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      
      // 세션 정보 조회 (현재는 직접 API가 없으므로 코드 조회로 대체)
      try {
        const codeData = await runsApi.getCode(runId);
        setJoinCode(codeData.code);
      } catch (err) {
        if (err.status === 400) {
          // 진행 중이 아닌 세션
          setJoinCode('');
          setPollingEnabled(false); // 폴링 중단
        } else {
          throw err;
        }
      }
      
    } catch (err) {
      console.error('세션 데이터 조회 오류:', err);
      setError('세션 정보를 불러올 수 없습니다.');
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
        }
      } else if (response.status === 410) {
        // 세션 종료됨
        setPollingEnabled(false);
        setJoinCode('');
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
      // 클립보드 API가 지원되지 않는 경우 fallback
      const textArea = document.createElement('textarea');
      textArea.value = joinCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('코드가 복사되었습니다!');
    }
  };

  const endSession = async () => {
    if (!window.confirm('세션을 종료하시겠습니까?\\n\\n종료 후에는 학생들이 더 이상 참여할 수 없습니다.')) {
      return;
    }

    try {
      setLoading(true);
      await runsApi.end(runId);
      toast.success('세션이 종료되었습니다.');
      setJoinCode(''); // 코드 제거
      setPollingEnabled(false); // 폴링 중단
      setLiveSnapshot(null); // 스냅샷 초기화
    } catch (err) {
      console.error('세션 종료 오류:', err);
      toast.error('세션 종료에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (joinCode) {
      return {
        status: 'LIVE',
        statusColor: 'bg-green-100 text-green-800 border-green-200',
        statusText: '🟢 진행 중',
        description: '학생들이 참여할 수 있습니다'
      };
    } else {
      return {
        status: 'ENDED',
        statusColor: 'bg-gray-100 text-gray-800 border-gray-200',
        statusText: '⚫ 종료됨',
        description: '세션이 종료되었습니다'
      };
    }
  };

  if (loading && !sessionRun && !joinCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">세션 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-800 mb-4">{error}</p>
          <button
            onClick={() => navigate('/teacher')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">세션 관리</h1>
              <p className="text-gray-600 mt-1">
                세션 ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{runId}</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/teacher')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← 대시보드
            </button>
          </div>
        </div>

        {/* 상태 및 코드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 세션 상태 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">세션 상태</h2>
            
            <div className="text-center">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${statusInfo.statusColor} mb-4`}>
                {statusInfo.statusText}
              </div>
              <p className="text-gray-600">{statusInfo.description}</p>
            </div>

            {/* 종료 버튼 */}
            {joinCode && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={endSession}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      종료 중...
                    </>
                  ) : (
                    '⛔ 세션 종료'
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  종료 후에는 학생들이 더 이상 참여할 수 없습니다
                </p>
              </div>
            )}
          </div>

          {/* 참여 코드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">참여 코드</h2>
            
            {joinCode ? (
              <div className="text-center">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">학생들이 입력할 코드</p>
                  <div className="inline-flex items-center bg-blue-50 border-2 border-blue-200 rounded-lg px-6 py-4">
                    <span className="text-3xl font-mono font-bold text-blue-900 tracking-wider">
                      {joinCode}
                    </span>
                  </div>
                </div>

                <button
                  onClick={copyCode}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  코드 복사
                </button>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>학생 안내:</strong> 학생들에게 이 6자리 코드를 알려주어 세션에 참여하도록 하세요.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="font-medium">참여 코드 없음</p>
                <p className="text-sm mt-1">세션이 종료되어 참여 코드가 비활성화되었습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 라이브 현황 (LIVE 상태일 때만 표시) */}
        {joinCode && liveSnapshot && (
          <div className="mt-6 space-y-6">
            {/* 참여자 요약 정보 - 크게 표시 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-3">
                    <span className="text-3xl font-bold text-blue-600">{liveSnapshot.joined_total}</span>
                  </div>
                  <p className="text-lg font-medium text-gray-700">총 참여자</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-3">
                    <span className="text-3xl font-bold text-green-600">{liveSnapshot.active_recent}</span>
                  </div>
                  <p className="text-lg font-medium text-gray-700">
                    활성 참여자
                    <span className="text-sm text-gray-500 block">
                      (최근 {windowSec >= 60 ? `${Math.floor(windowSec / 60)}분` : `${windowSec}초`})
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* 참여자 목록 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* 헤더 및 설정 */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">참여자 목록</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label htmlFor="window-select" className="text-sm text-gray-700">활성 기준:</label>
                      <select
                        id="window-select"
                        value={windowSec}
                        onChange={(e) => setWindowSec(parseInt(e.target.value))}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                      >
                        <option value={300}>5분</option>
                        <option value={900}>15분</option>
                        <option value={3600}>1시간</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${pollingEnabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className="text-xs text-gray-500">
                        {pollingEnabled ? `${pollingInterval/1000}초마다 갱신` : '갱신 중단'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 참여자 테이블 */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        참여자 이름
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        최근 활동 시간
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        턴 수
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {liveSnapshot.students.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                          아직 참여한 학생이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      liveSnapshot.students.map((student, index) => {
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
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                                <span className="text-sm font-medium text-gray-900">
                                  {student.student_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {lastSeenDate ? formatTimeAgo(diffMs) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
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

        {/* 안내 정보 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">세션 관리 안내</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>세션이 진행 중일 때만 학생들이 참여할 수 있습니다</li>
                  <li>참여 코드는 6자리 숫자로 구성되며 세션별로 고유합니다</li>
                  <li>세션을 종료하면 참여 코드가 비활성화되어 새로운 학생이 참여할 수 없습니다</li>
                  <li>종료된 세션은 다시 시작할 수 없습니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}