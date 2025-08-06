/**
 * API 통신 유틸리티 함수들
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE || '/api';

/**
 * API 요청을 위한 fetch 래퍼 함수
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // 쿠키 포함
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // API 오류 응답 처리
      throw new ApiError(response.status, data.detail || data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // 네트워크 오류 등
    throw new ApiError(0, {
      error: 'network_error',
      message: '서버와의 연결에 실패했습니다.',
    });
  }
}

/**
 * API 오류 클래스
 */
export class ApiError extends Error {
  constructor(status, detail) {
    super(detail.message || 'API 오류가 발생했습니다.');
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * 인증 관련 API 함수들
 */
export const authApi = {
  /**
   * 로그인
   */
  async login(email, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * 로그아웃
   */
  async logout() {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * 현재 사용자 정보 조회
   */
  async me() {
    return apiRequest('/auth/me');
  },
};

/**
 * 모드 관련 API 함수들
 */
export const modesApi = {
  /**
   * 모든 모드 목록 조회
   */
  async list() {
    return apiRequest('/modes/');
  },
};

/**
 * 템플릿 관련 API 함수들
 */
export const templatesApi = {
  /**
   * 템플릿 목록 조회
   */
  async list({ page = 1, size = 20, query = '', sort = 'created_at', order = 'desc' } = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort,
      order,
    });
    
    if (query) {
      params.append('query', query);
    }
    
    return apiRequest(`/templates/?${params.toString()}`);
  },

  /**
   * 템플릿 생성
   */
  async create(templateData) {
    return apiRequest('/templates/', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  },

  /**
   * 템플릿 상세 조회
   */
  async get(templateId) {
    return apiRequest(`/templates/${templateId}`);
  },

  /**
   * 템플릿 삭제
   */
  async delete(templateId) {
    return apiRequest(`/templates/${templateId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * 세션 실행 관련 API 함수들
 */
export const runsApi = {
  /**
   * 세션 실행 생성
   */
  async create(templateId, name) {
    return apiRequest('/runs/', {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId, name: name }),
    });
  },

  /**
   * 세션 시작
   */
  async start(runId) {
    return apiRequest(`/runs/${runId}/start`, {
      method: 'POST',
    });
  },

  /**
   * 세션 코드 조회
   */
  async getCode(runId) {
    return apiRequest(`/runs/${runId}/code`);
  },

  /**
   * 세션 종료
   */
  async end(runId) {
    return apiRequest(`/runs/${runId}/end`, {
      method: 'POST',
    });
  },

  /**
   * 세션 실행 목록 조회
   */
  async list({ template_id = null, status = '', page = 1, size = 20 } = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    if (template_id) {
      params.append('template_id', template_id.toString());
    }
    
    if (status) {
      params.append('status', status);
    }
    
    return apiRequest(`/runs/?${params.toString()}`);
  },
};

/**
 * 학생 세션 참여 관련 API 함수들
 */
export const joinApi = {
  /**
   * 세션 참여 (통합 API)
   */
  async join(code, studentName, rejoinPin = null) {
    const payload = { code, student_name: studentName };
    if (rejoinPin) {
      payload.rejoin_pin = rejoinPin;
    }
    
    return apiRequest('/join', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};