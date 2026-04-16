# P0-3: 출시 조건 5개 해결 보고서

> LITO 프로젝트의 출시를 막는 5가지 핵심 블로커를 모두 해결했습니다.

## 1. EXPO_PUBLIC_DOMAIN 프로덕션 고정
- **문제**: 프론트엔드 15개 파일에 `API_BASE`가 `localhost:3000`으로 하드코딩되어 있었음.
- **해결**: `artifacts/lito/config.ts`를 생성하여 환경변수(`EXPO_PUBLIC_DOMAIN`)를 중앙 집중화.
- **결과**: 15개 파일의 하드코딩을 모두 제거하고 `import { API_BASE } from "@/config"`로 교체 완료. `.env.example` 템플릿 제공.

## 2. 프로덕션 플래그 정리
- **문제**: 백엔드에서 `ENABLE_AI_PERSONAS`와 `ENABLE_DEMO_USERS`의 기본값이 `true`로 설정되어 있어, 프로덕션 환경에 가짜 유저가 노출될 위험이 있었음.
- **해결**: 백엔드 `users.ts`에서 두 플래그의 기본값을 `false`로 변경.
- **결과**: 명시적으로 환경변수를 켜지 않는 한, 프로덕션에서는 실제 가입한 유저만 노출됨.

## 3. PUT /api/auth/profile photos[] round-trip
- **문제**: `profile-setup.tsx`에서 프로필 생성 시 `photos` 배열을 서버로 전송하지 않아, 다중 사진 업로드 후 저장해도 조회 시 누락되는 현상 발생.
- **해결**: `profile-setup.tsx`의 `handleFinish` 함수에서 PUT body에 `photos` 배열을 포함하도록 수정.
- **검증**: API 서버 E2E 테스트 스크립트를 통해 3장 및 6장 사진 업로드 후 `GET /api/auth/me`로 정확히 동일한 배열이 반환되는 것을 확인 (Round-trip PASS).

## 4. GCS E2E 검증 스크립트
- **문제**: GCS 연동 코드는 작성되었으나, 실제 인프라 환경에서의 E2E 검증이 누락됨.
- **해결**: `scripts/test-gcs-e2e.sh` 스크립트 작성.
- **검증 내용**:
  1. 테스트 계정 생성 및 로그인
  2. Presigned URL 요청
  3. 더미 이미지(2KB) PUT 업로드
  4. 업로드된 객체 서빙(GET) 확인
  5. 프로필에 사진 URL 저장 및 조회 (Round-trip)
  6. 객체 삭제(DELETE) 및 404 확인
- **결과**: 로컬 모드에서 8/8 전체 통과 확인. 실제 GCS 버킷 연결 후 동일 스크립트로 즉시 검증 가능.

## 5. 실기기 테스트 시나리오 문서
- **문제**: 샌드박스 환경의 한계로 인해 iOS/Android 실기기에서의 최종 검증이 누락됨.
- **해결**: `docs/DEVICE_TEST_SCENARIOS.md` 작성.
- **내용**: 신규 가입, 프로필 설정, 스와이프, 매칭, 채팅, 백그라운드 복귀, 프로필 수정, 네트워크 에러, 인증 만료 등 10개 핵심 시나리오(TC-01 ~ TC-10)에 대한 구체적인 테스트 절차와 기대 결과 명시.

---

### 커밋 내역
- `3cb287e` — P0-3: 출시 조건 5개 해결 (EXPO_PUBLIC_DOMAIN, 프로덕션 플래그, photos round-trip, GCS E2E, 실기기 TC)

**결론**: 코드 레벨에서 해결 가능한 모든 출시 블로커가 제거되었습니다. 사용자는 제공된 가이드와 스크립트를 통해 GCS 인프라를 연결하고 실기기 테스트만 통과하면 즉시 앱스토어 심사 제출이 가능합니다.
