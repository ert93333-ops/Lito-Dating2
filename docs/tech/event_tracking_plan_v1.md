---
문서 ID: LITO-TECH-EVT-001
문서명: Event Tracking Plan v1
소유 팀: 08_기술설계실
버전: v1.0
문서 상태: LOCKED
입력 문서: KPI / AI / safety / billing / deletion 기준
영향 받는 하위 문서:
- analytics schema
- server event emitter
- dashboards
최종 수정일: 2026-04-21
---

# 핵심 이벤트

제품 퍼널:
- auth_completed
- age_gate_passed
- required_consents_completed
- profile_draft_saved
- profile_translation_preview_requested
- profile_published
- candidate_viewed
- candidate_action_submitted
- match_created
- first_message_sent
- first_reply_received

Trust & Safety:
- report_submitted
- block_user_completed
- contact_block_imported
- conversation_risk_flagged
- moderation_action_applied

AI:
- ai_consent_prompt_viewed
- ai_consent_accepted
- ai_consent_declined
- ai_consent_revoked
- translation_requested
- message_translation_rendered
- translation_retry
- original_text_viewed
- translation_failed
- coach_opened
- coach_request_started
- coach_request_completed
- coach_blocked_unsafe
- coach_blocked_zero_credit
- coach_blocked_no_consent
- profile_coach_opened
- profile_coach_saved
- ai_output_reported

Billing:
- paywall_viewed
- billing_purchase_started
- billing_purchase_verified
- billing_purchase_failed
- wallet_balance_viewed
- ledger_entry_created

Deletion:
- delete_request_started_in_app
- delete_web_flow_opened
- delete_request_submitted
- delete_processing_started
- delete_completed
- delete_failed

# 원칙

- raw message text / raw prompt / raw response analytics 금지
- server canonical event 우선
- WMCP 계산이 가능한 event chain 유지
