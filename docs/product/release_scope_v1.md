---
문서 ID: RELEASE-SCOPE-V1
문서명: LITO Release Scope v1
소유 팀: 05_제품기획실
버전: v1.0
문서 상태: LOCKED
입력 문서: PRD/Feature Scope/KPI/정책 기준
영향 받는 하위 문서:
- /docs/ux/*
- /docs/ai/*
- /docs/growth/*
- /docs/tech/*
최종 수정일: 2026-04-21
---

# Release Definition

- 18+ 성인 계정만 가입 가능
- KR/JP 로컬라이즈드 프로필과 채팅 번역 작동
- 공개 피드 없이 후보 탐색 → 상호 매칭 → 무료 1:1 텍스트 채팅 작동
- 신고/차단/연락처 차단/탈퇴 작동
- 스토어 심사와 개인정보 정책 기준 충족 가능

# Wave 0

- Must 기능 검증
- 번역 품질/오류 유형 파악
- 신고/차단/삭제 운영 경로 점검
- 유료 SKU 비활성 가능

# Wave 1

- 한국 우선·서울/수도권 중심 cohort 검증
- Must 기능 전체
- Should 일부 feature flag
- 하드 geofence 미전제

# Wave 2

- 대외 공개
- Must 기능 전체
- 정책 surface 완비
- 유료 기능이 있다면 store-compliant

# Go/No-Go

- 가입 → 프로필 → 탐색 → 매칭 → 채팅 → 신고/차단/탈퇴 end-to-end
- 번역 실패 시 원문 fallback
- 18+ gate 동작
- 삭제 앱 내 시작 + 웹 삭제 URL 동작
- 기본 채팅은 결제와 무관
- 리뷰용 계정/리뷰 노트 준비 가능
