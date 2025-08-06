#!/usr/bin/env python3
"""
Seed modes data for S2
"""
import asyncio
from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.mode import Mode


def seed_modes():
    """Seed initial mode data"""
    # Create modes data
    modes_data = [
        {
            "id": "strategic_writing",
            "name": "전략적 글쓰기",
            "version": "1.0",
            "options_schema": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "title": "주제",
                        "description": "글쓰기 주제를 입력하세요"
                    },
                    "difficulty": {
                        "type": "string",
                        "title": "난이도",
                        "enum": ["초급", "중급", "고급"],
                        "description": "글쓰기 난이도를 선택하세요"
                    }
                },
                "required": ["topic", "difficulty"]
            }
        },
        {
            "id": "prompt_practice",
            "name": "프롬프트 연습",
            "version": "1.0",
            "options_schema": {
                "type": "object",
                "properties": {
                    "objective": {
                        "type": "string",
                        "title": "목표",
                        "description": "연습 목표를 입력하세요"
                    },
                    "steps": {
                        "type": "integer",
                        "title": "단계 수",
                        "minimum": 1,
                        "maximum": 10,
                        "description": "연습 단계 수를 입력하세요 (1-10)"
                    }
                },
                "required": ["objective", "steps"]
            }
        },
        {
            "id": "socratic",
            "name": "소크라테스식 학습",
            "version": "1.0",
            "options_schema": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "title": "학습 주제",
                        "description": "궁금한 주제나 배우고 싶은 내용을 자유롭게 입력하세요 (예: 유니버설 디자인의 개념과 실생활 적용 사례)",
                        "minLength": 5,
                        "maxLength": 500
                    },
                    "content_type": {
                        "type": "string",
                        "title": "입력 방식",
                        "enum": ["text", "pdf", "url"],
                        "enumNames": ["📝 텍스트", "📄 PDF", "🔗 링크"],
                        "default": "text",
                        "description": "텍스트로 직접 입력하거나 향후 PDF 파일, 웹 링크도 지원 예정입니다"
                    },
                    "difficulty": {
                        "type": "string",
                        "title": "학습 난이도",
                        "enum": ["easy", "normal", "hard"],
                        "enumNames": ["🌱 쉬움 (기본 개념 위주)", "📚 보통 (중학생 수준)", "🎓 어려움 (깊이 있는 탐구)"],
                        "default": "normal",
                        "description": "학습자의 수준에 맞는 난이도를 선택하세요"
                    },
                    "score_display": {
                        "type": "string",
                        "title": "학습 진행도 표시",
                        "enum": ["show", "hide"],
                        "enumNames": ["📊 점수 보기 (실시간 진행률과 동기부여)", "🎯 점수 숨김 (순수한 탐구에 집중)"],
                        "default": "show",
                        "description": "학습 진행률을 표시할지 선택하세요"
                    }
                },
                "required": ["topic", "difficulty", "score_display"]
            }
        }
    ]
    
    with Session(engine) as session:
        # Check which modes already exist
        existing_modes = session.query(Mode).all()
        existing_mode_ids = {mode.id for mode in existing_modes}
        
        if existing_modes:
            print(f"ℹ️  기존 {len(existing_modes)}개 모드 확인:")
            for mode in existing_modes:
                print(f"   - {mode.id}: {mode.name}")
        
        # Create only new modes
        created_count = 0
        updated_count = 0
        
        for mode_data in modes_data:
            if mode_data["id"] in existing_mode_ids:
                # Update existing mode
                existing_mode = session.query(Mode).filter(Mode.id == mode_data["id"]).first()
                existing_mode.name = mode_data["name"]
                existing_mode.version = mode_data["version"]
                existing_mode.options_schema = mode_data["options_schema"]
                updated_count += 1
                print(f"🔄 모드 업데이트: {mode_data['id']} - {mode_data['name']}")
            else:
                # Create new mode
                mode = Mode(**mode_data)
                session.add(mode)
                created_count += 1
                print(f"✅ 모드 생성: {mode_data['id']} - {mode_data['name']}")
        
        session.commit()
        
        if created_count > 0 or updated_count > 0:
            print(f"\n🎉 결과: 생성 {created_count}개, 업데이트 {updated_count}개")
        else:
            print(f"\n✅ 모든 모드가 이미 최신 상태입니다.")


if __name__ == "__main__":
    print("📦 모드 시드 데이터 생성 시작...")
    seed_modes()
    print("✅ 모드 시드 데이터 생성 완료!")