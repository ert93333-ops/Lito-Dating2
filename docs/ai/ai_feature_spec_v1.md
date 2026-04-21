---
문서 ID: AI-FEATURE-SPEC-V1
문서명: LITO AI Feature Spec v1
소유 팀: 07_AI설계실
버전: v1.1
문서 상태: LOCKED
입력 문서: 제품/UX/정책/문화/수익화 기준
영향 받는 하위 문서:
- translation_policy_v1
- conversation_coach_spec_v1
- profile_coach_spec_v1
- ai_safety_rules_v1
- evaluation_plan_v1
- /docs/tech/*
최종 수정일: 2026-04-21
---

# AI 핵심 구조

Core:
- 프로필 번역
- 채팅 번역

Optional:
- 대화 코칭
- 프로필 코칭

# 공통 원칙

- Translation before coaching
- User request before coaching
- Safety before engagement
- Original text always accessible
- Privacy-minimized transmission
- No relationship substitution

# 상태 시스템

- normal
- translation_fail
- zero_credit
- unsafe_interaction
- consent_not_given

# 공통 데이터 원칙

전송 가능:
- 필요한 최소 텍스트
- source/target language
- 최소 문맥

전송 금지:
- userId 원문
- 연락처/이메일/위치
- 결제/크레딧 상세
- 신고/차단 이력 전체
- raw full history

# 차감 규칙

- 번역은 차감 대상 아님
- 코칭만 차감 후보
- 성공 반환 시에만 차감
- timeout / no consent / zero_credit / unsafe / validation 실패 시 차감 금지
