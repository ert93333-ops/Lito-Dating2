---
문서 ID: KPI-TREE-V1
문서명: LITO KPI Tree v1
소유 팀: 05_제품기획실
버전: v1.0
문서 상태: LOCKED
입력 문서: PRD/핵심 퍼널/AI 및 안전 기준
영향 받는 하위 문서:
- /docs/growth/*
- /docs/ai/evaluation_plan_v1.md
- /docs/tech/event_tracking_plan_v1.md
최종 수정일: 2026-04-21
---

# North Star

WMCP: Weekly Meaningful Conversation Pairs
정의:
- KR↔JP 성격의 매칭 페어 기준
- 매칭 후 7일 이내
- 양측이 각각 최소 2개 이상 텍스트 메시지를 보낸 유니크 pair 수

# 상위 구조

A. 유효 유입
- auth_completed
- age_gate_passed
- profile_started
- profile_published

B. 활성화
- profile completion rate
- profile translation preview rate
- candidate_viewed

C. 매칭 형성
- like_sent
- match_created
- time to first match

D. 대화 시작
- first_message_sent
- first_reply_received
- message_translation_rendered

E. 대화 지속
- translated message view
- original_text_viewed
- translation_feedback
- pair당 메시지 수

F. 신뢰/안전 가드레일
- report_submitted
- block_user_completed
- contact_block_saved
- delete_request_started_in_app
- 운영 처리 SLA
