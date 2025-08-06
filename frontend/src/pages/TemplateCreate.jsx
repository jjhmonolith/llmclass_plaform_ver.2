/**
 * 템플릿 생성 페이지
 */
import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { modesApi, templatesApi } from '../utils/api';
import toast from 'react-hot-toast';

export default function TemplateCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 단계별 상태
  const [currentStep, setCurrentStep] = useState(1); // 1: 모드 선택, 2: 폼 입력
  
  // 모드 관련 상태
  const [modes, setModes] = useState([]);
  const [selectedMode, setSelectedMode] = useState(null);
  const [loadingModes, setLoadingModes] = useState(true);
  
  // 템플릿 폼 상태
  const [formData, setFormData] = useState({
    title: '',
    settings: {}
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * 모드 목록 조회
   */
  const fetchModes = async () => {
    try {
      setLoadingModes(true);
      const modesList = await modesApi.list();
      setModes(modesList);
    } catch (error) {
      console.error('모드 목록 조회 실패:', error);
      toast.error('모드 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingModes(false);
    }
  };

  /**
   * 모드 선택
   */
  const selectMode = (mode) => {
    setSelectedMode(mode);
    
    // 모드의 스키마에 따라 초기 설정값 생성
    const initialSettings = {};
    if (mode.options_schema?.properties) {
      Object.keys(mode.options_schema.properties).forEach(key => {
        const property = mode.options_schema.properties[key];
        
        // 기본값 설정
        if (property.type === 'string') {
          initialSettings[key] = property.default || '';
        } else if (property.type === 'integer') {
          initialSettings[key] = property.minimum || 1;
        }
      });
    }
    
    setFormData({
      title: '',
      settings: initialSettings
    });
    
    setCurrentStep(2);
  };

  /**
   * 폼 데이터 변경 처리
   */
  const handleFormChange = (field, value) => {
    if (field === 'title') {
      setFormData(prev => ({ ...prev, title: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        settings: { ...prev.settings, [field]: value }
      }));
    }
    
    // 해당 필드의 오류 제거
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * 폼 검증
   */
  const validateForm = () => {
    const errors = {};
    
    // 제목 검증
    if (!formData.title.trim()) {
      errors.title = '제목을 입력해주세요.';
    }
    
    // 모드별 필수 필드 검증
    if (selectedMode?.options_schema?.required) {
      selectedMode.options_schema.required.forEach(field => {
        const value = formData.settings[field];
        if (!value || (typeof value === 'string' && !value.trim())) {
          const property = selectedMode.options_schema.properties[field];
          errors[field] = `${property?.title || field}을(를) 입력해주세요.`;
        }
      });
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 템플릿 생성 제출
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('입력값을 다시 확인해주세요.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const templateData = {
        mode_id: selectedMode.id,
        title: formData.title.trim(),
        settings_json: formData.settings
      };
      
      await templatesApi.create(templateData);
      
      toast.success('템플릿이 성공적으로 생성되었습니다!');
      navigate('/teacher/home');
      
    } catch (error) {
      console.error('템플릿 생성 실패:', error);
      
      // 백엔드 검증 오류 처리
      if (error.status === 400 && error.detail?.errors) {
        const serverErrors = {};
        error.detail.errors.forEach(err => {
          // path가 "root"인 경우 필드명 추출
          const fieldName = err.path === 'root' ? 
            err.message.match(/'([^']+)' is a required property/)?.[1] || 'unknown' : 
            err.path;
          serverErrors[fieldName] = err.message;
        });
        setFormErrors(serverErrors);
        toast.error('입력값을 다시 확인해주세요.');
      } else {
        toast.error('템플릿 생성에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 이전 단계로 이동
   */
  const goBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setSelectedMode(null);
      setFormData({ title: '', settings: {} });
      setFormErrors({});
    } else {
      navigate('/teacher/home');
    }
  };

  /**
   * Socratic 모드 전용 필드 렌더링
   */
  const renderSocraticField = (fieldName, property) => {
    const value = formData.settings[fieldName];
    const error = formErrors[fieldName];
    const isRequired = selectedMode?.options_schema?.required?.includes(fieldName);
    
    let input;
    let fieldHelp = null;
    
    switch (fieldName) {
      case 'topic':
        input = (
          <textarea
            value={value || ''}
            onChange={(e) => handleFormChange(fieldName, e.target.value)}
            className={`form-textarea ${error ? 'error' : ''}`}
            placeholder="예: 지구 온난화의 원인과 해결 방안"
            rows={3}
            maxLength={200}
            required={isRequired}
          />
        );
        fieldHelp = "💡 구체적이고 토론하기 좋은 주제를 입력하세요. (최대 200자)";
        break;

      case 'content_type':
        input = (
          <div className="segment-control" data-name={fieldName}>
            {[
              { value: 'text', icon: '📝', label: '텍스트', desc: '직접 텍스트로 입력' },
              { value: 'pdf', icon: '📄', label: 'PDF', desc: 'PDF 파일 업로드 (준비 중)', disabled: true },
              { value: 'url', icon: '🔗', label: '링크', desc: '웹 링크 입력 (준비 중)', disabled: true }
            ].map(option => (
              <Fragment key={option.value}>
                <input
                  type="radio"
                  id={`${fieldName}_${option.value}`}
                  name={fieldName}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleFormChange(fieldName, e.target.value)}
                  disabled={option.disabled}
                  required={isRequired}
                />
                <label htmlFor={`${fieldName}_${option.value}`} className={`segment-option ${option.disabled ? 'disabled' : ''}`}>
                  <span className="segment-icon">{option.icon}</span>
                  <span className="segment-text">{option.label}</span>
                  <span className="segment-desc">{option.desc}</span>
                </label>
              </Fragment>
            ))}
          </div>
        );
        fieldHelp = "💡 현재는 텍스트 입력만 지원됩니다. PDF와 링크 지원은 향후 추가 예정입니다.";
        break;
        
      case 'difficulty':
        input = (
          <div className="segment-control" data-name={fieldName}>
            {[
              { value: 'easy', icon: '🌱', label: '쉬움', desc: '기본 개념 위주' },
              { value: 'normal', icon: '📚', label: '보통', desc: '심화 사고 요구' },
              { value: 'hard', icon: '🎓', label: '어려움', desc: '창의적 분석 필요' }
            ].map(option => (
              <Fragment key={option.value}>
                <input
                  type="radio"
                  id={`${fieldName}_${option.value}`}
                  name={fieldName}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleFormChange(fieldName, e.target.value)}
                  required={isRequired}
                />
                <label htmlFor={`${fieldName}_${option.value}`} className="segment-option">
                  <span className="segment-icon">{option.icon}</span>
                  <span className="segment-text">{option.label}</span>
                  <span className="segment-desc">{option.desc}</span>
                </label>
              </Fragment>
            ))}
          </div>
        );
        fieldHelp = "💡 학습자 수준에 맞는 난이도를 선택하세요.";
        break;
        
      case 'score_display':
        input = (
          <div className="segment-control" data-name={fieldName}>
            {[
              { value: 'show', icon: '📊', label: '점수 보기', desc: '실시간 진행률과 동기부여' },
              { value: 'hide', icon: '🎯', label: '점수 숨김', desc: '순수한 탐구에 집중' }
            ].map(option => (
              <Fragment key={option.value}>
                <input
                  type="radio"
                  id={`${fieldName}_${option.value}`}
                  name={fieldName}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleFormChange(fieldName, e.target.value)}
                />
                <label htmlFor={`${fieldName}_${option.value}`} className="segment-option">
                  <span className="segment-icon">{option.icon}</span>
                  <span className="segment-text">{option.label}</span>
                  <span className="segment-desc">{option.desc}</span>
                </label>
              </Fragment>
            ))}
          </div>
        );
        fieldHelp = "✅ 점수 표시 여부를 선택하세요. 숨김 모드는 순수한 학습 탐구에 도움이 됩니다.";
        break;
        
        
      case 'max_turns':
        input = (
          <div className="range-input">
            <input
              type="range"
              value={value || 20}
              onChange={(e) => handleFormChange(fieldName, parseInt(e.target.value))}
              min={5}
              max={50}
              step={5}
              className="form-range"
              required={isRequired}
            />
            <div className="range-value">
              <span className="value-display">{value || 20}턴</span>
              <div className="range-labels">
                <span>5턴</span>
                <span>50턴</span>
              </div>
            </div>
          </div>
        );
        fieldHelp = "💡 대화 턴 수가 많을수록 더 깊이 있는 학습이 가능합니다.";
        break;
        
      default:
        // 기본 텍스트 입력
        input = (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFormChange(fieldName, e.target.value)}
            className={`form-input ${error ? 'error' : ''}`}
            placeholder={property.description || `${property.title}을 입력하세요`}
            required={isRequired}
          />
        );
    }
    
    return (
      <div key={fieldName} className={`form-field ${fieldName === 'topic' ? 'topic-field' : ''}`}>
        <label className="form-label">
          {property.title || fieldName}
          {isRequired && <span className="required">*</span>}
        </label>
        {input}
        {fieldHelp && <p className="field-help">{fieldHelp}</p>}
        {property.description && fieldName !== 'topic' && (
          <p className="field-description">{property.description}</p>
        )}
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  };

  /**
   * 동적 폼 필드 렌더링 (일반 모드용)
   */
  const renderFormField = (fieldName, property) => {
    const value = formData.settings[fieldName];
    const error = formErrors[fieldName];
    const isRequired = selectedMode?.options_schema?.required?.includes(fieldName);
    
    let input;
    
    if (property.type === 'boolean') {
      // 불린 타입 필드
      input = (
        <div className="checkbox-group">
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleFormChange(fieldName, e.target.checked)}
            />
            <span className="checkbox-label">{property.title}</span>
          </label>
        </div>
      );
    } else if (property.enum) {
      // 선택형 필드 (enum)
      input = (
        <select
          value={value || ''}
          onChange={(e) => handleFormChange(fieldName, e.target.value)}
          className={`form-select ${error ? 'error' : ''}`}
          required={isRequired}
        >
          <option value="">선택해주세요</option>
          {property.enum.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    } else if (property.type === 'integer') {
      // 숫자 입력 필드
      input = (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => handleFormChange(fieldName, parseInt(e.target.value) || '')}
          min={property.minimum || 1}
          max={property.maximum || 100}
          className={`form-input ${error ? 'error' : ''}`}
          placeholder={property.description || `${property.title}을 입력하세요`}
          required={isRequired}
        />
      );
    } else {
      // 텍스트 입력 필드
      input = (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleFormChange(fieldName, e.target.value)}
          className={`form-input ${error ? 'error' : ''}`}
          placeholder={property.description || `${property.title}을 입력하세요`}
          required={isRequired}
        />
      );
    }
    
    return (
      <div key={fieldName} className="form-field">
        <label className="form-label">
          {property.title || fieldName}
          {isRequired && <span className="required">*</span>}
        </label>
        {input}
        {property.description && (
          <p className="field-description">{property.description}</p>
        )}
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  };

  /**
   * 컴포넌트 마운트 시 모드 목록 조회
   */
  useEffect(() => {
    fetchModes();
  }, []);

  return (
    <div className="create-container">
      {/* 헤더 */}
      <div className="create-header">
        <button onClick={goBack} className="back-button">
          ← 뒤로
        </button>
        <h1>새 템플릿 만들기</h1>
        <div className="step-indicator">
          <span className={currentStep >= 1 ? 'active' : ''}>1. 모드 선택</span>
          <span className={currentStep >= 2 ? 'active' : ''}>2. 설정 입력</span>
        </div>
      </div>

      <div className="create-content">
        {/* Step 1: 모드 선택 */}
        {currentStep === 1 && (
          <div className="step-content">
            <div className="step-header">
              <h2>📝 모드를 선택해주세요</h2>
              <p>만들고 싶은 템플릿의 유형을 선택하세요.</p>
            </div>

            {loadingModes ? (
              <div className="loading-state">
                <p>🔄 모드 목록을 불러오는 중...</p>
              </div>
            ) : (
              <div className="modes-grid">
                {modes.map(mode => (
                  <div
                    key={mode.id}
                    className={`mode-card ${mode.id === 'socratic' ? 'socratic-mode' : ''}`}
                    onClick={() => selectMode(mode)}
                  >
                    {mode.id === 'socratic' && (
                      <div className="mode-badge">🎯 AI 튜터</div>
                    )}
                    <h3>
                      {mode.id === 'socratic' ? '🤖 ' : ''}
                      {mode.name}
                    </h3>
                    <p className="mode-version">v{mode.version}</p>
                    
                    {mode.id === 'socratic' ? (
                      <div className="mode-description">
                        <p>소크라테스식 산파법을 활용한 대화형 AI 튜터입니다.</p>
                        <div className="socratic-features">
                          <span className="feature">💬 대화형 학습</span>
                          <span className="feature">📊 실시간 평가</span>
                          <span className="feature">🧠 사고력 증진</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mode-fields">
                        <p><strong>필수 설정:</strong></p>
                        <ul>
                          {mode.options_schema?.required?.map(field => {
                            const property = mode.options_schema.properties[field];
                            return (
                              <li key={field}>{property?.title || field}</li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    
                    <button className={`select-button ${mode.id === 'socratic' ? 'socratic-button' : ''}`}>
                      {mode.id === 'socratic' ? '🎯 AI 튜터 선택' : '선택하기'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: 폼 입력 */}
        {currentStep === 2 && selectedMode && (
          <div className="step-content">
            <div className="form-container">
              <div className="form-section">
                <div className="step-header">
                  <h2>
                    {selectedMode.id === 'socratic' ? '🤖 AI 튜터' : '⚙️'} {selectedMode.name} 템플릿 설정
                  </h2>
                  {selectedMode.id === 'socratic' ? (
                    <div className="socratic-intro">
                      <p>🎯 <strong>소크라테스 대화 학습</strong> 템플릿을 설정합니다.</p>
                      <div className="intro-features">
                        <span>✨ AI가 질문으로 학습자의 사고를 이끌어냅니다</span>
                        <span>📈 실시간으로 이해도를 측정하고 피드백을 제공합니다</span>
                        <span>🎨 학습자 수준에 맞춰 난이도가 조절됩니다</span>
                      </div>
                    </div>
                  ) : (
                    <p>템플릿의 상세 설정을 입력해주세요.</p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="template-form">
                  {/* 제목 입력 */}
                  <div className="form-field">
                    <label className="form-label">
                      템플릿 제목 <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      className={`form-input ${formErrors.title ? 'error' : ''}`}
                      placeholder="예: 중2-글쓰기-비문학"
                      required
                    />
                    {formErrors.title && (
                      <p className="field-error">{formErrors.title}</p>
                    )}
                  </div>

                  {/* 동적 폼 필드들 */}
                  {selectedMode.options_schema?.properties && 
                    Object.entries(selectedMode.options_schema.properties).map(([fieldName, property]) => {
                      // Socratic 모드인 경우 전용 렌더링 함수 사용
                      if (selectedMode.id === 'socratic') {
                        return renderSocraticField(fieldName, property);
                      }
                      // 일반 모드인 경우 기본 렌더링 함수 사용
                      return renderFormField(fieldName, property);
                    })
                  }

                  {/* 제출 버튼 */}
                  <div className="form-actions">
                    <button 
                      type="button" 
                      onClick={goBack}
                      className="secondary-button"
                    >
                      이전 단계
                    </button>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="primary-button"
                    >
                      {submitting ? '생성 중...' : '템플릿 생성'}
                    </button>
                  </div>
                </form>
              </div>

              {/* 미리보기 패널 */}
              <div className="preview-section">
                <h3>📋 입력값 미리보기</h3>
                <div className="preview-content">
                  <div className="preview-item">
                    <strong>제목:</strong> {formData.title || '(미입력)'}
                  </div>
                  <div className="preview-item">
                    <strong>모드:</strong> {selectedMode.name}
                  </div>
                  <div className="preview-item">
                    <strong>설정값:</strong>
                    <pre className="settings-preview">
                      {JSON.stringify(formData.settings, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}