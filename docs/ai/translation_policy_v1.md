---
문서 ID: AI-TRANSLATION-POLICY-V1
문서명: LITO Translation Policy v1
소유 팀: 07_AI설계실
버전: v1.1
문서 상태: LOCKED
입력 문서: AI feature spec / 문화 기준
영향 받는 하위 문서:
- translation APIs
- translation worker
- realtime chat
최종 수정일: 2026-04-21
---

# 목표

- 의미 보존
- 공손함/톤 유지
- 감정 과장 금지
- soft-no 과잉 해석 금지
- 위험 발화 의미 보존

# 입력/출력

입력:
- sourceText
- sourceLanguage
- targetLanguage
- 짧은 문맥
- mode(profile/chat)

출력:
- translatedText
- confidenceLevel
- notes
- fallbackUsed

# 상태별 동작

normal:
- 번역 수행

translation_fail:
- 원문 유지
- retry CTA
- 채팅 계속 가능

consent_not_given:
- 번역 미수행
- 원문만 표시
- opt-in 요청

unsafe_interaction:
- 번역 가능
- 위험 의미를 완화/미화하지 않음

# 규칙

- 원문 대체 금지
- 경어 보수 유지
- 모호성 유지
- low confidence를 숨기지 않음
- 번역은 차감 대상 아님
