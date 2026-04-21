---
문서 ID: LITO-TECH-API-001
문서명: API Surface v1
소유 팀: 08_기술설계실
버전: v1.0
문서 상태: LOCKED
입력 문서: 제품/UX/AI/결제/삭제 기준
영향 받는 하위 문서:
- client SDK
- request/response validators
- WebSocket contract
최종 수정일: 2026-04-21
---

# 공통 응답

성공:
{ ok: true, data: {...}, request_id: "..." }

실패:
{
  ok: false,
  error: {
    code: "STRING_CODE",
    message: "...",
    block_reason: "optional"
  },
  request_id: "..."
}

# 핵심 API 범위

Auth:
- POST /v1/auth/apple
- POST /v1/auth/google
- POST /v1/auth/email/request-code
- POST /v1/auth/email/verify-code
- GET /v1/auth/session
- POST /v1/auth/logout

Onboarding/Policy:
- POST /v1/onboarding/age-gate
- POST /v1/onboarding/required-consents

Profile:
- GET /v1/me/profile
- PUT /v1/me/profile
- POST /v1/me/profile/photos
- POST /v1/me/profile/translation-preview
- POST /v1/me/profile/publish
- GET /v1/profiles/{public_id}

Discover/Matches:
- GET /v1/discover/candidates
- POST /v1/discover/actions
- GET /v1/matches
- POST /v1/matches/{match_id}/unmatch

Chat:
- GET /v1/conversations
- GET /v1/conversations/{conversation_id}/messages
- POST /v1/conversations/{conversation_id}/messages
- POST /v1/conversations/{conversation_id}/read
- POST /v1/messages/{message_id}/translation-retry
- GET /v1/messages/{message_id}/original

Translation / Consent:
- POST /v1/ai/consents/translation/grant
- POST /v1/translations/profile
- POST /v1/translations/message

Conversation Coach:
- POST /v1/ai/consents/conversation-coach/grant
- POST /v1/ai/conversation-coach

Profile Coach:
- POST /v1/ai/consents/profile-coach/grant
- POST /v1/ai/profile-coach
- POST /v1/ai/profile-coach/{coach_output_id}/save

Safety:
- POST /v1/reports
- POST /v1/blocks
- GET /v1/blocks
- DELETE /v1/blocks/{target_user_public_id}

Contact Block:
- POST /v1/contact-blocks/import
- GET /v1/contact-blocks
- DELETE /v1/contact-blocks/{id}

Deletion:
- POST /v1/account-deletion/start
- POST /v1/account-deletion/reauth
- POST /v1/account-deletion/web-handoff
- GET /public/account-deletion/confirm
- POST /public/account-deletion/submit
- GET /v1/account-deletion/status

Billing:
- GET /v1/billing/products
- POST /v1/billing/purchases/verify
- GET /v1/billing/wallet
- GET /v1/billing/ledger

Policy/Support:
- GET /v1/policies/bootstrap
- GET /v1/support/links

# block_reason examples

- coach_blocked_no_consent
- coach_blocked_zero_credit
- coach_blocked_unsafe
- conversation_blocked
- conversation_unmatched
- conversation_deletion_locked
- account_deletion_pending
- consent_not_given
- translation_fail
