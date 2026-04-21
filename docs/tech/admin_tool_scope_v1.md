---
문서 ID: LITO-TECH-ADMIN-001
문서명: Admin Tool Scope v1
소유 팀: 08_기술설계실
버전: v1.0
문서 상태: LOCKED
입력 문서: safety / deletion / billing / privacy 기준
영향 받는 하위 문서:
- admin UI IA
- RBAC config
- moderation runbook
- deletion ops runbook
최종 수정일: 2026-04-21
---

# 역할

- support_agent
- moderator
- safety_specialist
- privacy_ops
- billing_support
- admin_supervisor

# 신고 큐

- suspected_minor_queue
- scam_queue
- harassment_queue
- identity_fraud_queue
- generic_misconduct_queue
- ai_output_queue

# 우선순위

critical:
- suspected minor
- explicit scam
- identity fraud high signal
- severe sexual coercion

high:
- harassment 반복
- repeated pressure
- off-platform coercion

normal:
- generic misconduct
- low confidence identity concern
- tone complaint

# 사용자 상세

- account status
- visibility_status
- age_gate_passed
- policy acceptance
- ai consent status
- profile snapshot
- open reports / prior reports
- block history
- contact block count (원본 연락처 아님)
- active conversation risk flags
- deletion state
- wallet / recent purchases summary

# 운영 원칙

- raw prompt 장기 노출 금지
- 신고 증거 최소 열람
- AI safety review는 redacted excerpt 중심
- delete job retry / state tracking 가능
- admin action audit log 필수
