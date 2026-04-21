---
문서 ID: POLICY-ACCOUNT-DELETE-001
문서명: LITO Account Deletion Policy
소유 팀: 01_정책리스크실
버전: v1.0
문서 상태: LOCKED
입력 문서: Apple/Google 삭제 정책
영향 받는 하위 문서:
- /docs/ux/trust_and_safety_flow_v1.md
- /docs/tech/*
최종 수정일: 2026-04-21
---

# 삭제 원칙

- 탈퇴=비활성화가 아니다
- 앱 안에서 시작 가능해야 한다
- 웹 삭제 요청 페이지도 필요하다
- 즉시 비노출/세션 종료
- 일반 UGC는 삭제 원칙
- 신고/안전/결제 목적 최소 예외 보존만 허용
- 외부 로그인 revoke 포함

# 기본 삭제 모델

즉시 비노출
-> 즉시 접근 차단
-> 삭제 요청 접수
-> 고지된 기간 내 백엔드 삭제 완료

# 필수 UX

- Settings > Account > Delete Account
- 재인증
- 삭제 범위 안내
- 웹 삭제 handoff
- 완료 상태 확인 가능 구조
