/**
 * 교사 대시보드 페이지 - 템플릿 목록 관리
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { templatesApi } from '../utils/api';
import toast from 'react-hot-toast';

export default function TeacherHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // 템플릿 관련 상태
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  /**
   * 템플릿 목록 조회
   */
  const fetchTemplates = async (page = 1, query = '', sort = 'created_at', order = 'desc') => {
    try {
      setLoading(true);
      const response = await templatesApi.list({
        page,
        size: 20,
        query,
        sort,
        order
      });
      
      setTemplates(response.templates);
      setCurrentPage(response.page);
      setTotalPages(response.total_pages);
      
    } catch (error) {
      console.error('템플릿 목록 조회 실패:', error);
      toast.error('템플릿 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 검색 실행
   */
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTemplates(1, searchQuery, sortField, sortOrder);
  };

  /**
   * 페이지 변경
   */
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchTemplates(page, searchQuery, sortField, sortOrder);
  };

  /**
   * 정렬 변경
   */
  const handleSort = (field) => {
    const newOrder = (field === sortField && sortOrder === 'asc') ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    setCurrentPage(1);
    fetchTemplates(1, searchQuery, field, newOrder);
  };

  /**
   * 템플릿 상세 보기
   */
  const viewTemplate = (template) => {
    // 상세 보기 구현 (S2에서는 기본 alert로 표시)
    alert(`템플릿 상세:\n\n제목: ${template.title}\n모드: ${template.mode?.name}\n설정: ${JSON.stringify(template.settings_json, null, 2)}`);
  };

  /**
   * 템플릿 삭제
   */
  const deleteTemplate = async (template) => {
    if (!window.confirm(`"${template.title}" 템플릿을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await templatesApi.delete(template.id);
      toast.success('템플릿이 삭제되었습니다.');
      
      // 목록 새로고침
      fetchTemplates(currentPage, searchQuery, sortField, sortOrder);
      
    } catch (error) {
      console.error('템플릿 삭제 실패:', error);
      toast.error('템플릿 삭제에 실패했습니다.');
    }
  };

  /**
   * 새 템플릿 생성 페이지로 이동
   */
  const createNewTemplate = () => {
    navigate('/teacher/template/new');
  };

  /**
   * 컴포넌트 마운트 시 템플릿 목록 조회
   */
  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="dashboard-container">
      {/* 헤더 */}
      <div className="dashboard-header">
        <h1>📚 템플릿 관리</h1>
        <div className="user-info">
          <span>환영합니다, {user?.email}님!</span>
          <button onClick={logout} className="logout-button">
            로그아웃
          </button>
        </div>
      </div>

      {/* 검색 및 액션 바 */}
      <div className="dashboard-toolbar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="템플릿 제목이나 모드명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            🔍 검색
          </button>
        </form>
        
        <button onClick={createNewTemplate} className="create-button">
          ➕ 새 템플릿
        </button>
      </div>

      {/* 템플릿 목록 */}
      <div className="templates-content">
        {loading ? (
          <div className="loading-state">
            <p>📊 템플릿 목록을 불러오는 중...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="empty-state">
            <h3>📝 아직 생성된 템플릿이 없습니다</h3>
            <p>새 템플릿을 생성하여 수업을 시작해보세요!</p>
            <button onClick={createNewTemplate} className="create-button">
              ➕ 첫 번째 템플릿 만들기
            </button>
          </div>
        ) : (
          <>
            <div className="templates-table">
              <div className="table-header">
                <div 
                  className={`header-cell sortable ${sortField === 'title' ? 'active' : ''}`}
                  onClick={() => handleSort('title')}
                >
                  제목 {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
                <div className="header-cell">모드</div>
                <div 
                  className={`header-cell sortable ${sortField === 'updated_at' ? 'active' : ''}`}
                  onClick={() => handleSort('updated_at')}
                >
                  최근 수정 {sortField === 'updated_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
                <div className="header-cell">액션</div>
              </div>

              {templates.map((template) => (
                <div key={template.id} className="table-row">
                  <div className="table-cell">
                    <strong>{template.title}</strong>
                  </div>
                  <div className="table-cell">
                    <span className="mode-badge">
                      {template.mode?.name || template.mode_id}
                    </span>
                  </div>
                  <div className="table-cell">
                    {new Date(template.updated_at).toLocaleString('ko-KR')}
                  </div>
                  <div className="table-cell">
                    <div className="action-buttons">
                      <button 
                        onClick={() => viewTemplate(template)}
                        className="action-button view-button"
                      >
                        👁️ 보기
                      </button>
                      <button 
                        onClick={() => window.location.href = `/teacher/run/manage?template_id=${template.id}`}
                        className="action-button run-button"
                        style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: '1px solid #059669',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          margin: '0 2px'
                        }}
                      >
                        📋 세션 관리
                      </button>
                      <button 
                        onClick={() => deleteTemplate(template)}
                        className="action-button delete-button"
                      >
                        🗑️ 삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  ← 이전
                </button>
                
                <span className="pagination-info">
                  {currentPage} / {totalPages} 페이지
                </span>
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  다음 →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}