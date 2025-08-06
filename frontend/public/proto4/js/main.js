class TopicInputHandler {
    constructor() {
        // 동적으로 API 베이스 URL 설정
        this.apiBase = this.getApiBase();
        this.init();
    }
    
    getApiBase() {
        // 배포 환경에서는 상대 경로 사용 (Nginx 프록시를 통해)
        return '/api/v1';
    }

    init() {
        const form = document.getElementById('topicForm');
        const loading = document.getElementById('loading');
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const topic = formData.get('topic').trim();
        const contentType = formData.get('contentType');
        const difficulty = formData.get('difficulty');
        const scoreDisplay = formData.get('scoreDisplay');
        
        if (!topic) {
            alert('학습 주제를 입력해주세요.');
            return;
        }
        
        this.showLoading();
        
        try {
            // 1. 주제 검증
            await this.validateTopic(topic, contentType);
            
            // 2. 채팅 페이지로 이동
            this.navigateToChat(topic, difficulty, scoreDisplay);
            
        } catch (error) {
            this.hideLoading();
            console.error('Error:', error);
            alert(error.message || '오류가 발생했습니다. 다시 시도해주세요.');
        }
    }
    
    async validateTopic(topic, contentType) {
        const response = await fetch(`${this.apiBase}/topic/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic_content: topic,
                content_type: contentType
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '주제 검증에 실패했습니다.');
        }
        
        return await response.json();
    }
    
    navigateToChat(topic, difficulty, scoreDisplay) {
        // URL 파라미터로 주제, 난이도, 점수 표시 옵션 전달
        const params = new URLSearchParams({
            topic: topic,
            difficulty: difficulty,
            showScore: scoreDisplay === 'show'
        });
        window.location.href = `/pages/socratic-chat.html?${params.toString()}`;
    }
    
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    new TopicInputHandler();
});

// 유용한 유틸리티 함수들
const utils = {
    // 텍스트 길이 제한 확인
    validateTextLength(text, maxLength = 1000) {
        return text.length <= maxLength;
    },
    
    // 안전한 HTML 인코딩
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // 로컬 스토리지에 주제 저장 (나중에 활용 가능)
    saveTopicHistory(topic) {
        try {
            const history = JSON.parse(localStorage.getItem('topicHistory') || '[]');
            if (!history.includes(topic)) {
                history.unshift(topic);
                // 최대 10개까지만 저장
                if (history.length > 10) {
                    history.pop();
                }
                localStorage.setItem('topicHistory', JSON.stringify(history));
            }
        } catch (error) {
            console.warn('Failed to save topic history:', error);
        }
    }
};