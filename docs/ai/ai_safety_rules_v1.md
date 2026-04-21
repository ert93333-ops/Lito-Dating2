---
문서 ID: AI-SAFETY-RULES-V1
문서명: LITO AI Safety Rules v1
소유 팀: 07_AI설계실
버전: v1.1
문서 상태: LOCKED
입력 문서: 제품/정책/문화 기준
영향 받는 하위 문서:
- translation / coach / profile coach / evaluation
최종 수정일: 2026-04-21
---

# 핵심 원칙

- 안전이 대화 성공보다 우선
- AI는 설득/압박/조작 도구가 아님
- high-severity는 보수적 처리
- 위험 신호 시 safety CTA 우선

# 위험 클래스

- money_request
- investment_crypto
- off_platform_push
- sexual_coercion
- harassment
- self_harm_risk
- minor_risk
- identity_fraud_risk

# 기능별 규칙

번역:
- 위험 의미를 순화하지 않음

대화 코칭:
- unsafe_interaction이면 일반 코칭 중단

프로필 코칭:
- 미성년/외부연락/성적 암시/공략 카피 제거

# 상태별 차단

- normal
- translation_fail
- zero_credit
- unsafe_interaction
- consent_not_given

# 운영 규칙

- high-risk는 사람 검토 또는 기능 제한 우선
- AI 결과는 신고 가능
- 안전 regression set 통과 전 rollout 금지
