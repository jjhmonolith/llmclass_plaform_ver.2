class SocraticChatPlatform {
    constructor() {
        this.apiBase = window.PLATFORM_CONFIG?.apiBase || '/api/v1';
        this.platformApiBase = window.PLATFORM_CONFIG?.platformApiBase || '/api';
        this.topic = '';
        this.messages = [];
        this.understandingScore = 0;
        this.isCompleted = false;
        this.showScore = true;
        this.difficulty = 'normal';
        
        // 플랫폼 연동 데이터
        this.runId = window.PLATFORM_CONFIG?.runId;
        this.studentName = window.PLATFORM_CONFIG?.studentName;
        this.activityToken = window.PLATFORM_CONFIG?.activityToken;
        this.turnIndex = 1;
        this.sessionEnded = false;
        
        // 세션 정보
        this.sessionName = window.PLATFORM_CONFIG?.sessionName || '세션';
        this.templateName = window.PLATFORM_CONFIG?.templateName || '템플릿';
        this.rejoinPin = window.PLATFORM_CONFIG?.rejoinPin;
        
        this.init();
    }
    
    init() {
        // 플랫폼 설정에서 주제, 난이도, 점수 표시 옵션 추출
        const settings = window.PLATFORM_CONFIG?.settings || {};
        this.topic = settings.topic || '학습 주제';
        this.difficulty = settings.difficulty || 'normal';
        this.showScore = settings.score_display === 'show';
        
        if (!this.topic) {
            alert('주제가 설정되지 않았습니다.');
            this.sendToPlatform('error', { message: '주제가 설정되지 않았습니다.' });
            return;
        }
        
        // UI 초기화
        this.initializeUI();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 첫 메시지 로드
        this.loadInitialMessage();
        
        // 세션 상태 체크 시작
        this.startSessionStatusCheck();
    }
    
    sendToPlatform(type, data) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: type,
                data: data,
                source: 'proto4-chat'
            }, '*');
        }
    }
    
    // 활동 로그 저장 (플랫폼 API 사용)
    async saveActivityLog(activityData) {
        if (!this.activityToken || !this.runId || !this.studentName) {
            console.warn('Missing platform data for activity log');
            return false;
        }
        
        try {
            const response = await fetch(`${this.platformApiBase}/activity-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.activityToken}`
                },
                body: JSON.stringify({
                    activity_key: 'socratic_chat',
                    turn_index: activityData.turn_index,
                    student_input: activityData.student_input,
                    ai_output: activityData.ai_output,
                    third_eval_json: activityData.evaluation || {}
                })
            });
            
            if (response.ok) {
                console.log('Activity log saved successfully');
                return true;
            } else {
                console.error('Failed to save activity log:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Error saving activity log:', error);
            return false;
        }
    }
    
    initializeUI() {
        // 주제 타이틀 설정
        const topicTitle = document.getElementById('topicTitle');
        if (topicTitle) {
            topicTitle.textContent = this.topic;
        }
        
        // 플랫폼 정보 설정
        const sessionNameEl = document.getElementById('sessionName');
        const templateNameEl = document.getElementById('templateName');
        const studentNameEl = document.getElementById('studentNameDisplay');
        const pinBtn = document.getElementById('pinBtn');
        
        if (sessionNameEl) {
            sessionNameEl.textContent = this.sessionName;
        }
        if (templateNameEl) {
            templateNameEl.textContent = `📋 ${this.templateName}`;
        }
        if (studentNameEl) {
            studentNameEl.textContent = `👤 ${this.studentName}`;
        }
        if (pinBtn && this.rejoinPin) {
            pinBtn.style.display = 'block';
        }
        
        // 점수 표시 옵션에 따라 UI 조정
        const progressSection = document.querySelector('.progress-section');
        const chatContainer = document.querySelector('.chat-container');
        
        if (progressSection) {
            if (this.showScore) {
                progressSection.style.display = 'block';
                this.updateUnderstandingGauge(0);
                if (chatContainer) {
                    chatContainer.classList.remove('score-hidden');
                }
            } else {
                if (chatContainer) {
                    chatContainer.classList.add('score-hidden');
                }
                if (window.innerWidth > 768) {
                    progressSection.style.display = 'none';
                    const chatMain = document.querySelector('.chat-main');
                    if (chatMain) {
                        chatMain.style.gridTemplateColumns = '1fr';
                    }
                }
            }
        }
    }
    
    setupEventListeners() {
        this.setupFormHandlers();
        this.setupButtonHandlers();
        this.setupKeyboardHandlers();
        this.setupMobileFeatures();
    }
    
    setupFormHandlers() {
        const forms = ['chatForm', 'chatFormMobile'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', (e) => this.handleChatSubmit(e));
            }
        });
    }
    
    setupButtonHandlers() {
        const sendBtnMobile = document.getElementById('sendBtnMobile');
        if (sendBtnMobile) {
            sendBtnMobile.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleChatSubmit(e);
            });
        }
        
        // PIN 버튼
        const pinBtn = document.getElementById('pinBtn');
        if (pinBtn) {
            pinBtn.addEventListener('click', () => {
                this.showPinModal();
            });
        }
        
        // 학습 종료 버튼
        const exitBtn = document.getElementById('exitBtn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                this.confirmExit();
            });
        }
    }
    
    setupKeyboardHandlers() {
        const inputs = [
            { inputId: 'messageInput', formId: 'chatForm' },
            { inputId: 'messageInputMobile', formId: 'chatFormMobile' }
        ];
        
        inputs.forEach(({ inputId, formId }) => {
            const input = document.getElementById(inputId);
            const form = document.getElementById(formId);
            
            if (input && form) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        form.dispatchEvent(new Event('submit'));
                    }
                });
            }
        });
    }
    
    setupMobileFeatures() {
        if (window.innerWidth <= 768) {
            this.initializeDrawer();
        }
        
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                this.initializeDrawer();
            }
        });
    }
    
    initializeDrawer() {
        const scoreDrawer = document.getElementById('scoreDrawer');
        const drawerHandleArea = document.getElementById('drawerHandleArea');
        
        if (!scoreDrawer) return;
        
        if (drawerHandleArea && !drawerHandleArea.hasAttribute('data-initialized')) {
            drawerHandleArea.setAttribute('data-initialized', 'true');
            
            drawerHandleArea.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDrawer();
            });
            
            document.addEventListener('click', (e) => {
                if (scoreDrawer.classList.contains('open') && 
                    !scoreDrawer.contains(e.target)) {
                    if (e.target.closest('.chat-section')) {
                        this.closeDrawer();
                    }
                }
            });
        }
    }
    
    toggleDrawer() {
        const scoreDrawer = document.getElementById('scoreDrawer');
        if (scoreDrawer && this.showScore) {
            if (scoreDrawer.classList.contains('open')) {
                this.closeDrawer();
            } else {
                this.openDrawer();
            }
        }
    }
    
    openDrawer() {
        const scoreDrawer = document.getElementById('scoreDrawer');
        if (scoreDrawer && this.showScore) {
            scoreDrawer.classList.add('open');
        }
    }
    
    closeDrawer() {
        const scoreDrawer = document.getElementById('scoreDrawer');
        if (scoreDrawer) {
            scoreDrawer.classList.remove('open');
        }
    }
    
    async loadInitialMessage() {
        try {
            const response = await fetch(`${this.apiBase}/chat/initial`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: this.topic,
                    difficulty: this.difficulty
                })
            });
            
            if (!response.ok) {
                throw new Error('초기 메시지 로드에 실패했습니다.');
            }
            
            const data = await response.json();
            
            this.hideLoadingMessage();
            this.addMessage('ai', data.initial_message);
            this.enableInput();
            
            // 플랫폼에 초기 메시지 로드 완료 알림
            this.sendToPlatform('initial_message_loaded', {
                message: data.initial_message
            });
            
            // 활동 로그 저장
            await this.saveActivityLog({
                turn_index: 0,
                student_input: null,
                ai_output: data.initial_message,
                evaluation: { initial: true, understanding_score: 0 }
            });
            
        } catch (error) {
            console.error('Error loading initial message:', error);
            this.hideLoadingMessage();
            this.addMessage('ai', '안녕하세요! 함께 탐구해볼까요?');
            this.enableInput();
            
            this.sendToPlatform('error', {
                message: '초기 메시지 로드 실패',
                error: error.message
            });
        }
    }
    
    async handleChatSubmit(event) {
        event.preventDefault();
        
        const messageInput = document.getElementById('messageInput');
        const messageInputMobile = document.getElementById('messageInputMobile');
        
        let currentInput = null;
        let userMessage = '';
        
        if (messageInputMobile && window.innerWidth <= 768) {
            currentInput = messageInputMobile;
            userMessage = messageInputMobile.value.trim();
        } else if (messageInput && window.innerWidth > 768) {
            currentInput = messageInput;
            userMessage = messageInput.value.trim();
        }
        
        if (!userMessage || !currentInput) {
            return;
        }
        
        this.addMessage('user', userMessage);
        this.messages.push({ role: 'user', content: userMessage });
        
        currentInput.value = '';
        this.disableInput();
        
        try {
            const response = await fetch(`${this.apiBase}/chat/socratic`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: this.topic,
                    messages: this.messages,
                    understanding_level: this.understandingScore,
                    difficulty: this.difficulty
                })
            });
            
            if (!response.ok) {
                throw new Error('AI 응답을 받아올 수 없습니다.');
            }
            
            const data = await response.json();
            
            this.addMessage('ai', data.socratic_response);
            this.messages.push({ role: 'assistant', content: data.socratic_response });
            
            if (this.showScore) {
                this.updateSocraticEvaluation(data);
                
                if (data.is_completed && !this.isCompleted) {
                    this.showCompletionCelebration();
                    this.isCompleted = true;
                    
                    this.sendToPlatform('learning_completed', {
                        understanding_score: data.understanding_score
                    });
                }
            } else {
                this.understandingScore = data.understanding_score;
            }
            
            // 활동 로그 저장
            await this.saveActivityLog({
                turn_index: this.turnIndex,
                student_input: userMessage,
                ai_output: data.socratic_response,
                evaluation: {
                    understanding_score: data.understanding_score,
                    is_completed: data.is_completed,
                    dimensions: data.dimensions,
                    insights: data.insights,
                    growth_indicators: data.growth_indicators,
                    next_focus: data.next_focus
                }
            });
            
            this.turnIndex++;
            
            // 플랫폼에 대화 진행 알림
            this.sendToPlatform('conversation_progress', {
                turn: this.turnIndex - 1,
                understanding_score: data.understanding_score,
                is_completed: data.is_completed
            });
            
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('ai', '죄송해요, 일시적인 오류가 발생했습니다. 다시 말씀해 주세요.');
            
            this.sendToPlatform('error', {
                message: '대화 처리 실패',
                error: error.message
            });
        } finally {
            this.enableInput();
        }
    }
    
    addMessage(role, content) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'ai' ? '🏛️' : '👤';
        
        if (role === 'ai') {
            this.triggerGlowEffect('chat');
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    updateSocraticEvaluation(data) {
        this.understandingScore = data.understanding_score;
        this.updateUnderstandingGauge(data.understanding_score);
        
        if (data.dimensions) {
            this.updateDimensionVisualization(data.dimensions);
        }
        
        if (data.growth_indicators) {
            this.updateGrowthIndicators(data.growth_indicators);
        }
        
        if (data.next_focus) {
            this.updateNextFocus(data.next_focus);
        }
        
        this.triggerGlowEffect('progress');
    }

    updateUnderstandingGauge(score) {
        this.understandingScore = score;
        
        const gaugeFill = document.getElementById('gaugeFill');
        const scoreText = document.getElementById('scoreText');
        const progressFeedback = document.getElementById('progressFeedback');
        
        if (gaugeFill) {
            gaugeFill.style.width = `${score}%`;
        }
        
        if (scoreText) {
            scoreText.textContent = score;
        }
        
        if (progressFeedback) {
            progressFeedback.textContent = this.getProgressFeedback(score);
        }
    }
    
    updateDimensionVisualization(dimensions) {
        let dimensionContainer = document.getElementById('dimensionContainer');
        if (!dimensionContainer) {
            dimensionContainer = this.createDimensionContainer();
        }
        
        Object.entries(dimensions).forEach(([key, value]) => {
            const dimensionElement = document.getElementById(`dimension-${key}`);
            if (dimensionElement) {
                const bar = dimensionElement.querySelector('.dimension-bar-fill');
                const scoreText = dimensionElement.querySelector('.dimension-score');
                
                if (bar) bar.style.width = `${value}%`;
                if (scoreText) scoreText.textContent = value;
                
                if (bar) {
                    bar.className = `dimension-bar-fill ${this.getScoreClass(value)}`;
                }
            }
        });
    }
    
    createDimensionContainer() {
        const drawerContent = document.querySelector('.drawer-content');
        if (!drawerContent) return null;
        
        const dimensionContainer = document.createElement('div');
        dimensionContainer.id = 'dimensionContainer';
        dimensionContainer.className = 'dimension-container';
        dimensionContainer.innerHTML = `
            <h4>📊 소크라테스식 5차원 평가</h4>
            <div class="dimensions-grid">
                <div id="dimension-depth" class="dimension-item">
                    <span class="dimension-label">🌊 사고 깊이</span>
                    <div class="dimension-bar">
                        <div class="dimension-bar-fill" style="width: 0%"></div>
                    </div>
                    <span class="dimension-score">0</span>
                </div>
                <div id="dimension-breadth" class="dimension-item">
                    <span class="dimension-label">🌐 사고 확장</span>
                    <div class="dimension-bar">
                        <div class="dimension-bar-fill" style="width: 0%"></div>
                    </div>
                    <span class="dimension-score">0</span>
                </div>
                <div id="dimension-application" class="dimension-item">
                    <span class="dimension-label">🔗 실생활 적용</span>
                    <div class="dimension-bar">
                        <div class="dimension-bar-fill" style="width: 0%"></div>
                    </div>
                    <span class="dimension-score">0</span>
                </div>
                <div id="dimension-metacognition" class="dimension-item">
                    <span class="dimension-label">🪞 메타인지</span>
                    <div class="dimension-bar">
                        <div class="dimension-bar-fill" style="width: 0%"></div>
                    </div>
                    <span class="dimension-score">0</span>
                </div>
                <div id="dimension-engagement" class="dimension-item">
                    <span class="dimension-label">⚡ 소크라테스적 참여</span>
                    <div class="dimension-bar">
                        <div class="dimension-bar-fill" style="width: 0%"></div>
                    </div>
                    <span class="dimension-score">0</span>
                </div>
            </div>
        `;
        
        const understandingGauge = drawerContent.querySelector('.understanding-gauge');
        if (understandingGauge) {
            understandingGauge.insertAdjacentElement('afterend', dimensionContainer);
        } else {
            drawerContent.appendChild(dimensionContainer);
        }
        
        return dimensionContainer;
    }
    
    updateGrowthIndicators(indicators) {
        let growthContainer = document.getElementById('growthContainer');
        if (!growthContainer) {
            growthContainer = this.createGrowthContainer();
        }
        
        const indicatorsList = growthContainer.querySelector('.growth-list');
        if (indicatorsList && indicators.length > 0) {
            indicatorsList.innerHTML = indicators.map(indicator => 
                `<li class="growth-item">🌱 ${indicator}</li>`
            ).join('');
        }
    }
    
    createGrowthContainer() {
        const drawerContent = document.querySelector('.drawer-content');
        if (!drawerContent) return null;
        
        const growthContainer = document.createElement('div');
        growthContainer.id = 'growthContainer';
        growthContainer.className = 'growth-container';
        growthContainer.innerHTML = `
            <h4>📈 성장 지표</h4>
            <ul class="growth-list"></ul>
        `;
        
        const understandingGauge = drawerContent.querySelector('.understanding-gauge');
        if (understandingGauge) {
            understandingGauge.insertAdjacentElement('afterend', growthContainer);
        } else {
            drawerContent.appendChild(growthContainer);
        }
        
        return growthContainer;
    }
    
    updateNextFocus(focus) {
        let focusContainer = document.getElementById('focusContainer');
        if (!focusContainer) {
            focusContainer = this.createFocusContainer();
        }
        
        const focusText = focusContainer.querySelector('.focus-text');
        if (focusText) {
            focusText.textContent = focus;
        }
    }
    
    createFocusContainer() {
        const drawerContent = document.querySelector('.drawer-content');
        if (!drawerContent) return null;
        
        const focusContainer = document.createElement('div');
        focusContainer.id = 'focusContainer';
        focusContainer.className = 'focus-container';
        focusContainer.innerHTML = `
            <h4>🎯 다음 탐구 방향</h4>
            <p class="focus-text"></p>
        `;
        
        const growthContainer = drawerContent.querySelector('.growth-container');
        if (growthContainer) {
            growthContainer.insertAdjacentElement('afterend', focusContainer);
        } else {
            const understandingGauge = drawerContent.querySelector('.understanding-gauge');
            if (understandingGauge) {
                understandingGauge.insertAdjacentElement('afterend', focusContainer);
            } else {
                drawerContent.appendChild(focusContainer);
            }
        }
        
        return focusContainer;
    }
    
    getScoreClass(score) {
        if (score >= 80) return 'score-excellent';
        if (score >= 60) return 'score-good';
        if (score >= 40) return 'score-fair';
        return 'score-needs-improvement';
    }
    
    getProgressFeedback(score) {
        if (score <= 20) {
            return "탐구 시작: 이제 막 탐구를 시작했어요! 함께 알아가봐요 🌱";
        } else if (score <= 40) {
            return "기초 이해: 기본적인 이해가 생겼어요! 더 깊이 들어가볼까요? 💡";
        } else if (score <= 60) {
            return "초급 수준: 개념을 잘 이해하고 있어요! 연결고리를 찾아보세요 🔗";
        } else if (score <= 80) {
            return "중급 수준: 훌륭한 이해력이에요! 비판적 사고를 시작해보세요 🧠";
        } else if (score < 100) {
            return "고급 수준: 전문가 수준의 깊은 이해를 보여주고 있어요! 🌟";
        } else {
            return "마스터 완성: 완벽한 이해를 달성했습니다! 🏆";
        }
    }
    
    showCompletionCelebration() {
        const celebration = document.getElementById('completionCelebration');
        if (celebration) {
            celebration.style.display = 'block';
            
            setTimeout(() => {
                celebration.style.display = 'none';
            }, 5000);
        }
    }
    
    hideLoadingMessage() {
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
    }
    
    triggerGlowEffect(targetSection) {
        if (!this.showScore) return;
        
        if (window.innerWidth <= 768) {
            const currentActive = this.getCurrentActiveSection();
            
            if (targetSection === 'progress' && currentActive === 'chat') {
                this.showScoreUpdateNotification();
            }
        }
    }
    
    getCurrentActiveSection() {
        if (window.innerWidth <= 768) {
            const scoreDrawer = document.getElementById('scoreDrawer');
            if (scoreDrawer && scoreDrawer.classList.contains('open')) {
                return 'progress';
            }
            return 'chat';
        }
        return 'both';
    }
    
    showScoreUpdateNotification() {
        const scoreDrawer = document.getElementById('scoreDrawer');
        const drawerHandleArea = document.getElementById('drawerHandleArea');
        
        if (scoreDrawer && drawerHandleArea) {
            scoreDrawer.classList.add('score-updated');
            drawerHandleArea.classList.add('glow');
            
            setTimeout(() => {
                scoreDrawer.classList.remove('score-updated');
                drawerHandleArea.classList.remove('glow');
            }, 1000);
        }
    }
    
    toggleInput(enabled) {
        const isMobile = window.innerWidth <= 768;
        const elements = [
            { id: 'messageInput', focus: !isMobile && enabled },
            { id: 'sendBtn', focus: false },
            { id: 'messageInputMobile', focus: isMobile && enabled },
            { id: 'sendBtnMobile', focus: false }
        ];
        
        elements.forEach(({ id, focus }) => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = !enabled;
                if (focus) {
                    element.focus();
                }
            }
        });
    }
    
    enableInput() {
        if (!this.sessionEnded) {
            this.toggleInput(true);
        }
    }
    
    disableInput() {
        this.toggleInput(false);
    }
    
    // 세션 상태 체크 (10초마다)
    startSessionStatusCheck() {
        if (!this.activityToken) return;
        
        const statusInterval = setInterval(async () => {
            if (this.sessionEnded) {
                clearInterval(statusInterval);
                return;
            }
            
            try {
                const response = await fetch(`${this.platformApiBase}/session/status`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.activityToken}`,
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (response.status === 410) {
                    // 세션 종료됨
                    console.log('Session ended detected');
                    this.handleSessionEnded();
                    clearInterval(statusInterval);
                }
            } catch (error) {
                console.log('Session status check failed:', error);
            }
        }, 10 * 1000); // 10초마다
    }
    
    // 세션 종료 처리
    handleSessionEnded() {
        this.sessionEnded = true;
        this.disableInput();
        
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.classList.add('session-ended');
        }
        
        this.showSessionEndedModal();
        
        this.sendToPlatform('session_ended', {
            message: '세션이 종료되었습니다.'
        });
    }
    
    // PIN 모달 표시
    showPinModal() {
        if (!this.rejoinPin) {
            alert('재참여 PIN 정보가 없습니다.');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'pin-modal';
        modal.innerHTML = `
            <div class="pin-modal-content">
                <h3>🔐 재참여 PIN 번호</h3>
                <div class="pin-display">${this.rejoinPin}</div>
                <div class="pin-description">
                    새로고침하거나 다른 기기에서 접속할 때<br>
                    이 PIN 번호로 기존 학습 기록을 불러올 수 있습니다.
                </div>
                <button onclick="this.parentElement.parentElement.remove()">확인</button>
            </div>
        `;
        
        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
    
    // 학습 종료 확인
    confirmExit() {
        if (confirm('정말로 학습을 종료하고 새 세션에 참여하시겠습니까?')) {
            this.exitToNewSession();
        }
    }
    
    // 새 세션 참여로 이동
    exitToNewSession() {
        this.sendToPlatform('exit_to_new_session', {});
        
        // iframe이 아닌 경우 직접 이동
        if (window.parent === window) {
            // 세션 정보 정리
            localStorage.removeItem('sessionCache');
            sessionStorage.clear();
            window.location.href = '/student/join';
        }
    }
    
    // 세션 종료 모달 표시
    showSessionEndedModal() {
        const modal = document.createElement('div');
        modal.className = 'session-ended-overlay';
        modal.innerHTML = `
            <div class="session-ended-modal">
                <div style="font-size: 48px; margin-bottom: 20px;">📚</div>
                <h2>학습 세션이 종료되었습니다</h2>
                <p>
                    선생님이 이 학습 세션을 종료했습니다.<br>
                    더 이상 대화를 나눌 수 없습니다.
                </p>
                <div class="modal-actions">
                    <button class="primary-btn" onclick="this.parentElement.parentElement.parentElement.parentElement.querySelector('.exit-action').click()">
                        새 세션 참여하기
                    </button>
                </div>
                <button class="exit-action" style="display: none;"></button>
            </div>
        `;
        
        // 새 세션 참여 버튼 이벤트
        const exitAction = modal.querySelector('.exit-action');
        exitAction.addEventListener('click', () => {
            this.exitToNewSession();
        });
        
        document.body.appendChild(modal);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    new SocraticChatPlatform();
});