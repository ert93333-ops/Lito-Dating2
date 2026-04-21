---
문서 ID: LITO-TECH-DB-001
문서명: Database Schema v1
소유 팀: 08_기술설계실
버전: v1.0
문서 상태: LOCKED
입력 문서: 시스템/AI/삭제/수익화 기준
영향 받는 하위 문서:
- migrations
- ORM schema
- API validators
최종 수정일: 2026-04-21
---

# 핵심 엔터티

- users
- auth_identities
- policy_acceptances
- user_verifications
- profiles
- profile_photos
- profile_translations
- discovery_actions
- matches
- conversations
- conversation_members
- conversation_risk_flags
- messages
- message_receipts
- message_translations
- ai_consents
- ai_request_logs
- ai_outputs
- reports
- report_evidence
- blocks
- contact_blocks
- iap_purchases
- entitlements
- credit_wallets
- ai_ledger
- delete_requests
- delete_jobs
- delete_events
- moderation_actions
- admin_audit_logs

# 핵심 규칙

- age gate/adult flag는 users 최상위
- consent는 translation / conversation_coach / profile_coach 기능별 분리
- message와 translation 분리
- report evidence 최소 보존 구조
- delete_request와 delete_completed 분리
- AI 결과 신고 가능 구조
- source of truth는 ai_ledger, wallet.balance_cache는 조회 최적화용
