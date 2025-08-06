import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { templatesApi, runsApi } from '../utils/api';
import toast from 'react-hot-toast';

export default function RunNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template_id');
  
  const [template, setTemplate] = useState(null);
  const [sessionRun, setSessionRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('RunNew 페이지 로드됨, 템플릿 ID:', templateId);
    
    if (!templateId) {
      toast.error('템플릿 ID가 필요합니다.');
      navigate('/teacher');
      return;
    }

    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      console.log('템플릿 조회 시작, ID:', templateId);
      setLoading(true);
      const data = await templatesApi.get(templateId);
      console.log('템플릿 조회 성공:', data);
      setTemplate(data);
    } catch (err) {
      console.error('템플릿 조회 오류:', err);
      setError('템플릿을 불러올 수 없습니다: ' + err.message);
      toast.error('템플릿을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const createRun = async () => {
    try {
      console.log('세션 생성 시작, 템플릿 ID:', templateId);
      setLoading(true);
      const runData = await runsApi.create(templateId);
      console.log('세션 생성 성공:', runData);
      setSessionRun(runData);
      toast.success('세션이 생성되었습니다!');
    } catch (err) {
      console.error('세션 생성 오류:', err);
      console.error('오류 상세:', err.status, err.detail);
      toast.error('세션 생성에 실패했습니다: ' + (err.detail?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const startRun = async () => {
    try {
      setLoading(true);
      await runsApi.start(sessionRun.id);
      toast.success('세션이 시작되었습니다!');
      
      // 라이브 페이지로 이동
      navigate(`/teacher/run/live?run_id=${sessionRun.id}`);
    } catch (err) {
      console.error('세션 시작 오류:', err);
      toast.error('세션 시작에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">템플릿 정보를 불러오는 중...</p>
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

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">새 세션 만들기</h1>
              <p className="text-gray-600 mt-1">템플릿을 기반으로 새로운 세션을 시작합니다</p>
            </div>
            <button
              onClick={() => navigate('/teacher')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← 돌아가기
            </button>
          </div>
        </div>

        {/* 템플릿 정보 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">템플릿 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">제목</dt>
              <dd className="text-sm text-gray-900 mt-1">{template.title}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">모드</dt>
              <dd className="text-sm text-gray-900 mt-1">{template.mode_id}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-gray-500">설정</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(template.settings_json, null, 2)}
                </pre>
              </dd>
            </div>
          </div>
        </div>

        {/* 세션 생성/시작 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {!sessionRun ? (
            /* 세션 생성 단계 */
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">세션 생성하기</h3>
                <p className="text-gray-600">
                  이 템플릿으로 새로운 세션을 생성하여 학생들이 참여할 수 있도록 준비합니다.
                </p>
              </div>

              <button
                onClick={createRun}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                    생성 중...
                  </>
                ) : (
                  '세션 생성'
                )}
              </button>
            </div>
          ) : (
            /* 세션 시작 단계 */
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">세션이 생성되었습니다!</h3>
                <p className="text-gray-600 mb-4">
                  세션 ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{sessionRun.id}</span>
                </p>
                <p className="text-gray-600">
                  이제 세션을 시작하여 학생들이 참여할 수 있는 6자리 코드를 받으세요.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={startRun}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      시작 중...
                    </>
                  ) : (
                    '🚀 세션 시작하기'
                  )}
                </button>
                
                <div>
                  <button
                    onClick={() => navigate('/teacher')}
                    className="text-gray-600 hover:text-gray-800 underline"
                  >
                    나중에 시작하기 (대시보드로 돌아가기)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}