---
문서 ID: POLICY-PRIVACY-MAP-001
문서명: LITO Privacy Data Map
소유 팀: 01_정책리스크실
버전: v1.0
문서 상태: LOCKED
입력 문서: 정책/AI/삭제 기준
영향 받는 하위 문서:
- /docs/ai/*
- /docs/tech/*
- Privacy Policy / App Privacy / Data Safety
최종 수정일: 2026-04-21
---

# 일반 서비스 데이터

- 계정/인증 데이터
- 프로필 데이터
- 프로필 사진 메타데이터
- 매칭/추천 상태
- 채팅 원문

이 데이터는 core service 범주이며 Privacy Policy/App Privacy/Data Safety에 명시한다.

# Optional AI 전송 데이터

- 번역을 위한 메시지/프로필 일부 텍스트
- 대화 코칭을 위한 최근 문맥 일부
- 프로필 코칭을 위한 현재 bio/headline

원칙:
- 기능별 first-use opt-in
- 일반 서비스 데이터와 분리 관리
- 동의 철회 시 즉시 중단

# 비전송 데이터

- userId 원문
- 이메일/전화번호
- 위치
- 결제/크레딧 상세
- 신고/차단 이력 전체
- 운영자 메모
- full raw history

# 저장 원칙

- raw prompt/response 장기 저장 금지
- 구조화 결과만 단기 저장
- 신고/제재/분쟁 데이터는 최소 예외 보존 가능
