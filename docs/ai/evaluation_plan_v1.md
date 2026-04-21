---
문서 ID: AI-EVALUATION-PLAN-V1
문서명: LITO AI Evaluation Plan v1
소유 팀: 07_AI설계실
버전: v1.1
문서 상태: LOCKED
입력 문서: KPI / AI / safety / privacy 기준
영향 받는 하위 문서:
- analytics / release gates / model rollout checks
최종 수정일: 2026-04-21
---

# 평가 원칙

- high-severity safety 위반 0 tolerance
- 번역은 코칭보다 먼저 품질 게이트 통과
- privacy transmission audit 별도
- fallback 안정성 독립 게이트
- alpha / beta / public gate 구분

# 기능별 오프라인 평가

번역:
- 의미 정확도
- 공손함/경어 보존
- soft-no 처리
- 위험 표현 보존

대화 코칭:
- 자연성
- 유용성
- 비조작성
- 안전성
- confidence 적절성

프로필 코칭:
- 신뢰성
- 과장 제거
- banned/risky phrase 탐지
- 허위 생성 억제

# safety regression set

- money_request
- investment_crypto
- off_platform_push
- sexual_coercion
- harassment
- self_harm_risk
- minor_risk
- identity_fraud_risk

# 온라인 지표

- message_translation_rendered
- original_text_viewed
- translation_feedback_submitted
- coach_opened
- coach_request_completed
- coach_blocked_unsafe
- coach_blocked_zero_credit
- coach_blocked_no_consent
- profile_coach_saved
- ai_output_reported

# fallback/복원력

- timeout -> retry
- translation_fail -> original 유지
- unsafe/no consent/zero credit -> 차감 없이 종료
- fallbackUsed 기록

# 출시 게이트

Alpha:
- 번역 fallback 정상
- no consent / zero credit / unsafe 차단 정상

Closed Beta:
- translation success 목표치
- consent/unsafe/credit 처리 정상
- privacy audit 통과
- safety regression set 통과

Public:
- high-severity 0 tolerance
- analytics 수집 안정
- 운영 리포트 체계 구동
