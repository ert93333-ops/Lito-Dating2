---
문서 ID: CORE-USER-FLOW-V1
문서명: LITO Core User Flow v1
소유 팀: 05_제품기획실
버전: v1.0
문서 상태: LOCKED
입력 문서: PRD/Feature Scope/정책/문화 기준
영향 받는 하위 문서:
- /docs/ux/*
- /docs/ai/*
- /docs/tech/*
최종 수정일: 2026-04-21
---

# 상태 모델

Visitor
-> Authenticated
-> Age passed
-> Consent completed
-> Profile draft
-> Profile complete
-> Discovering
-> Matched
-> Chat active
-> Reported / Blocked / Unmatched / Retained
-> Deletion requested
-> Deleted

# Happy Path

1. 앱 진입
2. 로그인 방식 선택
3. 18+ 확인 및 정책 동의
4. 프로필 작성
5. 번역 미리보기 확인
6. 후보 프로필 탐색
7. 상호 like로 매칭 생성
8. 무료 1:1 텍스트 채팅 시작
9. 실시간 번역으로 대화 지속
10. 필요 시 신고/차단/매칭 해제
11. 설정에서 연락처 차단 관리 또는 계정 삭제 요청

# Edge Rules

- 번역 서비스 장애: 메시지 송수신 유지, 원문 우선 노출, 재시도 제공
- 로그인 수단 이슈: 다른 로그인 수단 fallback 제공
- 프로필 미완성 이탈: draft 저장 후 복귀 시 이어쓰기
- 상대 차단 후 재진입: 기본은 재노출 방지
