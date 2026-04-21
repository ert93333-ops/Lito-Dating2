---
문서 ID: LITO-TECH-RTC-001
문서명: Realtime Chat Spec v1
소유 팀: 08_기술설계실
버전: v1.0
문서 상태: LOCKED
입력 문서: chat/translation/AI/safety 기준
영향 받는 하위 문서:
- WebSocket types
- message service
- translation worker
최종 수정일: 2026-04-21
---

# 핵심 원칙

- message_sent 성공과 translation_render 성공은 별개
- 원문 먼저, 번역은 비동기 보조 레이어
- client_message_id idempotency
- conversation 단위 server_seq ordering
- reconnect backfill
- offline outbox
- block 후 즉시 접근 차단
- delete 후 신규 송수신 금지
- unsafe_interaction에서는 번역 유지, 코칭 차단

# client -> server events

- chat.subscribe
- chat.send_message
- chat.mark_read
- chat.retry_translation

# server -> client events

- chat.subscribed
- chat.backfill
- chat.message_accepted
- chat.message_created
- chat.translation_updated
- chat.receipt_updated
- chat.conversation_locked
- chat.safety_state_updated

# 상태

message:
- local_draft
- queued_offline
- sending
- accepted
- delivered
- read
- failed_terminal

translation:
- pending
- success
- failed
- consent_required
