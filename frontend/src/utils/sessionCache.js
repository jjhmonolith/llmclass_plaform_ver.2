/**
 * 세션 임시 캐시 관리 (localStorage 기반)
 */

const CACHE_KEY = 'session_temp';
const CACHE_DURATION_MINUTES = 30; // 환경변수에서 가져올 수 있지만 일단 하드코딩

/**
 * 기존 캐시 데이터 조회 (만료 여부 상관없이)
 */
function getExistingCacheData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (error) {
    return null;
  }
}

/**
 * 세션 정보를 임시 캐시에 저장 (마지막 활동 시점부터 30분 만료)
 */
export function saveSessionCache(runId, studentName, rejoinPin = null, activityToken = null) {
  try {
    const now = Date.now();
    
    // 기존 캐시에서 joined_at 유지 (최초 입장 시간 보존)
    const existingCache = getExistingCacheData();
    const joinedAt = (existingCache && existingCache.run_id === runId && existingCache.student_name === studentName) 
      ? existingCache.joined_at 
      : now;
    
    const cacheData = {
      run_id: runId,
      student_name: studentName,
      rejoin_pin: rejoinPin || existingCache?.rejoin_pin, // PIN 정보 유지
      activity_token: activityToken || existingCache?.activity_token, // 활동 토큰 유지
      joined_at: joinedAt, // 최초 입장 시간 유지
      last_activity_at: now, // 마지막 활동 시간 갱신
      expires_at: now + (CACHE_DURATION_MINUTES * 60 * 1000) // 현재 시점부터 30분 후 만료
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log('Session cache updated:', { 
      runId, 
      studentName, 
      hasPin: !!cacheData.rejoin_pin, 
      expiresIn: CACHE_DURATION_MINUTES + 'min',
      lastActivity: new Date(now).toLocaleTimeString()
    });
  } catch (error) {
    console.warn('Failed to save session cache:', error);
  }
}

/**
 * 세션 캐시 조회 (유효한 것만)
 */
export function getSessionCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const now = Date.now();
    
    // 만료 확인
    if (cacheData.expires_at <= now) {
      clearSessionCache();
      return null;
    }
    
    return {
      runId: cacheData.run_id,
      studentName: cacheData.student_name,
      rejoinPin: cacheData.rejoin_pin,
      activityToken: cacheData.activity_token,
      joinedAt: new Date(cacheData.joined_at),
      lastActivityAt: new Date(cacheData.last_activity_at || cacheData.joined_at), // 하위 호환성
      expiresAt: new Date(cacheData.expires_at),
      remainingMinutes: Math.ceil((cacheData.expires_at - now) / (60 * 1000))
    };
  } catch (error) {
    console.warn('Failed to get session cache:', error);
    clearSessionCache();
    return null;
  }
}

/**
 * 세션 캐시 삭제
 */
export function clearSessionCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('Session cache cleared');
  } catch (error) {
    console.warn('Failed to clear session cache:', error);
  }
}

/**
 * 만료된 캐시 정리 (페이지 로드시 호출)
 */
export function cleanupExpiredCache() {
  const cache = getSessionCache();
  // getSessionCache에서 이미 만료된 것은 정리하므로 별도 작업 불필요
  return cache;
}