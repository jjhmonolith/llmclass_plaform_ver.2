/**
 * 브라우저별 세션 관리 유틸리티
 */

// 브라우저 고유 세션 ID 생성
function generateBrowserSessionId() {
  // 기존에 있으면 사용, 없으면 새로 생성
  let sessionId = sessionStorage.getItem('browser_session_id');
  
  if (!sessionId) {
    // 브라우저 정보를 조합해서 고유 ID 생성
    const userAgent = navigator.userAgent;
    const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    
    const browserFingerprint = btoa(`${userAgent}-${screenInfo}-${timezone}-${language}`);
    sessionId = `bs_${timestamp}_${random}_${browserFingerprint.substring(0, 16)}`;
    
    sessionStorage.setItem('browser_session_id', sessionId);
  }
  
  return sessionId;
}

// 세션 캐시에 브라우저 세션 ID 추가
export function saveSecureSessionCache(runId, studentName, rejoinPin, activityToken) {
  const browserSessionId = generateBrowserSessionId();
  
  const sessionData = {
    runId,
    studentName,
    rejoinPin,
    activityToken,
    browserSessionId,
    lastActivity: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  
  try {
    localStorage.setItem('student_session', JSON.stringify(sessionData));
    console.log('Secure session saved with browser ID:', browserSessionId);
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

// 보안 강화된 세션 캐시 조회
export function getSecureSessionCache() {
  try {
    const cached = localStorage.getItem('student_session');
    if (!cached) return null;
    
    const sessionData = JSON.parse(cached);
    const currentBrowserSessionId = generateBrowserSessionId();
    
    // 브라우저 세션 ID 검증
    if (sessionData.browserSessionId !== currentBrowserSessionId) {
      console.warn('Browser session mismatch - clearing cache');
      clearSecureSessionCache();
      return null;
    }
    
    // 세션 만료 체크 (24시간)
    const createdAt = new Date(sessionData.createdAt);
    const now = new Date();
    const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      console.warn('Session expired - clearing cache');
      clearSecureSessionCache();
      return null;
    }
    
    return sessionData;
  } catch (error) {
    console.error('Failed to get session:', error);
    clearSecureSessionCache();
    return null;
  }
}

// 세션 캐시 삭제
export function clearSecureSessionCache() {
  try {
    localStorage.removeItem('student_session');
    sessionStorage.removeItem('browser_session_id');
    console.log('Secure session cleared');
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

// 세션 유효성 검증
export function validateSession() {
  const session = getSecureSessionCache();
  
  if (!session) {
    return { valid: false, reason: 'no_session' };
  }
  
  if (!session.runId || !session.studentName || !session.activityToken) {
    return { valid: false, reason: 'incomplete_session' };
  }
  
  return { valid: true, session };
}