---
문서 ID: LITO-TECH-SYS-001
문서명: System Architecture v1
소유 팀: 08_기술설계실
버전: v1.0
문서 상태: LOCKED
입력 문서: 제품/UX/정책/AI/수익화 기준
영향 받는 하위 문서:
- database schema
- api surface
- realtime chat spec
- event tracking plan
- admin tool scope
최종 수정일: 2026-04-21
---

# 상위 구조

Mobile App
-> API Server
-> PostgreSQL
-> Redis
-> Worker
-> Object Storage
-> External AI Provider
-> Billing Verification Adapter
-> Admin Tool
-> Analytics Sink

# 원칙

- 모듈형 모노리스 + 비동기 워커
- 서버 authoritative
- consent/credit/unsafe 서버 최종 재검증
- 번역 실패 != 채팅 실패
- raw prompt/response 장기 저장 금지
- delete = request + async jobs

# 권장 모듈

- auth
- onboarding
- profiles
- discover
- matches
- chat
- translations
- ai_consents
- ai_coach
- safety
- moderation
- billing
- deletion
- admin
- analytics

# 핵심 흐름

- auth/session
- profile draft / translation preview / publish
- discover / like / pass / match create
- chat send -> ack -> broadcast -> translation async
- coach request -> server gate -> provider -> validate -> debit
- delete start -> hide -> revoke -> purge
