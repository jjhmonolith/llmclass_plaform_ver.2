import React from 'react';
import { useSearchParams } from 'react-router-dom';

export default function RunNewSimple() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template_id');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Run 생성 페이지 테스트</h1>
        <p className="text-gray-600 mb-4">
          템플릿 ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{templateId || '없음'}</span>
        </p>
        
        {templateId ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">✅ 템플릿 ID가 정상적으로 전달되었습니다!</p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">❌ 템플릿 ID가 전달되지 않았습니다.</p>
          </div>
        )}
        
        <div className="mt-6">
          <button 
            onClick={() => window.location.href = '/teacher'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            ← 대시보드로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}