---
문서 ID: AI-CONVERSATION-COACH-V1
문서명: LITO Conversation Coach Spec v1
소유 팀: 07_AI설계실
버전: v1.1
문서 상태: LOCKED
입력 문서: AI feature spec / safety rules / 수익화 기준
영향 받는 하위 문서:
- coach APIs
- wallet/ledger
- paywall UI
최종 수정일: 2026-04-21
---

# 기능 목적

- 답장 초안 제안
- 과한 표현 완화
- 문화 오해 가능성 설명
- 공손함/부담도 조정

# 실행 조건

1. 사용자 명시적 요청
2. unsafe_interaction 아님
3. zero_credit 아님
4. consent_not_given 아님
5. 상호 매칭된 1:1 텍스트 채팅 컨텍스트
6. 유효한 draft/context

# 출력 스키마

- primarySuggestion
- alternateSuggestions
- rationale
- caution
- confidence
- fallbackUsed
- rewriteMode
- avoidList

# 금지

- 자동 실행
- 감정 확정
- 상대 의도 확정
- read receipt 기반 조언
- 조종/밀당/압박
- unsafe 상황에서 일반 코칭

# 상태별 동작

normal:
- 요청 가능, 성공 반환 시 차감

zero_credit:
- 실행 불가
- 채팅/번역 유지
- paywall은 요청 후에만

unsafe_interaction:
- 실행 불가
- safety notice + report/block CTA

consent_not_given:
- 실행 불가
- feature opt-in 요청

# 차감 규칙

- 성공 반환 시에만
- timeout / internal error / unsafe / no consent / zero_credit / validation fail 시 차감 금지
