/**
 * Activity Logger Hook - 활동 로그 자동 저장
 */
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const API_BASE_URL = '/api';

export const useActivityLogger = (activityToken, runId, studentName, onSessionEnded = null) => {
  const [isLogging, setIsLogging] = useState(false);
  const [lastLoggedTurn, setLastLoggedTurn] = useState(null);

  const saveTurn = useCallback(async (turnData) => {
    const { activityKey, turnIndex, studentInput, aiOutput, thirdEvalJson } = turnData;

    if (!activityToken) {
      console.warn('Activity token not available, cannot save turn');
      toast.error('세션 토큰이 없습니다. 페이지를 새로고침해주세요.');
      return false;
    }

    if (isLogging) {
      console.warn('Already logging, skipping duplicate save');
      return false;
    }

    setIsLogging(true);

    try {
      const response = await fetch(`${API_BASE_URL}/activity-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activityToken}`,
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          activity_key: activityKey,
          turn_index: turnIndex,
          student_input: studentInput || null,
          ai_output: aiOutput || null,
          third_eval_json: thirdEvalJson || null
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Activity log saved: ${activityKey} turn ${turnIndex}`, result);
        
        setLastLoggedTurn({
          activityKey,
          turnIndex,
          timestamp: new Date().toISOString()
        });

        // 성공 시 조용히 처리 (toast 없음)
        return true;

      } else if (response.status === 401) {
        // 토큰 만료 또는 무효
        console.error('Activity token expired or invalid');
        toast.error('세션이 만료되었습니다. 재참여해주세요.', {
          onClick: () => {
            // 재참여 페이지로 이동
            window.location.href = `/student/join?code=${runId}&rejoin=true`;
          }
        });
        return false;

      } else if (response.status === 410) {
        // 세션 종료됨
        console.error('Session ended');
        toast.error('세션이 종료되었습니다.');
        // 콜백 함수가 있으면 호출
        if (onSessionEnded) {
          onSessionEnded();
        }
        return false;

      } else if (response.status === 409) {
        // 중복 저장 (이미 해당 턴이 저장됨)
        // 개발 환경에서는 StrictMode로 인해 자주 발생하므로 디버그 레벨로만 로깅
        if (import.meta.env.DEV) {
          console.debug(`Duplicate turn save (expected in dev): ${activityKey} turn ${turnIndex}`);
        } else {
          console.warn(`Duplicate turn save: ${activityKey} turn ${turnIndex}`);
        }
        return true; // 중복은 성공으로 처리

      } else if (response.status === 429) {
        // 레이트리밋
        console.warn('Rate limit exceeded for activity logging');
        toast.warn('너무 빠르게 저장하고 있습니다. 잠시 후 다시 시도됩니다.');
        return false;

      } else {
        // 기타 오류
        const errorData = await response.json().catch(() => ({}));
        console.error('Activity log save failed:', response.status, errorData);
        toast.error('활동 저장에 실패했습니다.');
        return false;
      }

    } catch (error) {
      console.error('Network error while saving activity log:', error);
      toast.error('네트워크 오류로 활동을 저장할 수 없습니다.');
      return false;

    } finally {
      setIsLogging(false);
    }
  }, [activityToken, runId, isLogging]);

  // 자동 저장 헬퍼 함수들
  const logStudentInput = useCallback((activityKey, turnIndex, input) => {
    return saveTurn({
      activityKey,
      turnIndex,
      studentInput: input,
      aiOutput: null,
      thirdEvalJson: null
    });
  }, [saveTurn]);

  const logAIResponse = useCallback((activityKey, turnIndex, input, output) => {
    return saveTurn({
      activityKey,
      turnIndex,
      studentInput: input,
      aiOutput: output,
      thirdEvalJson: null
    });
  }, [saveTurn]);

  const logComplete = useCallback((activityKey, turnIndex, input, output, evaluation) => {
    return saveTurn({
      activityKey,
      turnIndex,
      studentInput: input,
      aiOutput: output,
      thirdEvalJson: evaluation
    });
  }, [saveTurn]);

  return {
    saveTurn,
    logStudentInput,
    logAIResponse,
    logComplete,
    isLogging,
    lastLoggedTurn
  };
};