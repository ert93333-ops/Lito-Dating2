---
문서 ID: UX-CHAT-V1
문서명: LITO Chat Flow v1
소유 팀: 06_UX신뢰설계실
버전: v1.0
문서 상태: LOCKED
입력 문서: PRD/UX/AI 기준
영향 받는 하위 문서:
- chat API
- translation UI
- coach entry surfaces
최종 수정일: 2026-04-21
---

# 원칙

- 상호 매칭 후에만 채팅
- 기본 텍스트 채팅 무료
- 1:1 only
- KR↔JP 실시간 번역 Must
- 원문 보기 / 재시도 / fallback 필수
- 번역 실패가 메시지 실패가 아님
- 신고/차단/언매치는 채팅 내부에서 접근
- AI 코칭은 후순위, 위험 상황에서는 코칭 끄고 safety 우선
- zero_credit이어도 기본 채팅은 유지

# 상태

- Chat List
- Chat Room
- Empty Chat State
- Message Translation State
- Translation Fallback Sheet
- Chat Safety Menu
- Unsafe Interaction Warning
