# P0-1 Close-Out: Mock 데이터 완전 제거 및 핵심 화면 API 연동

**작성일**: 2025-04-16  
**상태**: Close-out 완료  
**커밋**: 이 문서와 함께 커밋됨

---

## 1. 증빙 요약

### 증빙 1: mockData.ts import 참조 0건

`grep -rn` 기준으로 `artifacts/lito/` 디렉토리 전체에서 `mockData`를 import하는 파일이 **0건**입니다.

> 상세 결과: `P0_1_EVIDENCE_1_GREP.txt`

| 검색 패턴 | 결과 |
|-----------|------|
| `from.*mockData` | 0건 |
| `import.*mockData` | 0건 |
| `require.*mockData` | 0건 |
| `CURRENT_USER_ID` 하드코딩 | 0건 |
| `MY_ID` 하드코딩 | 0건 |

`mockData.ts` 파일 자체는 삭제하지 않고 남겨두었습니다 (참조 0건이므로 프로덕션 빌드에 포함되지 않음). 필요 시 `rm artifacts/lito/data/mockData.ts`로 완전 삭제 가능합니다.

---

### 증빙 2-3: API 서버 가동 확인 및 엔드포인트 응답

API 서버를 로컬에서 가동하여 3개 핵심 엔드포인트의 응답을 확인했습니다.

> 상세 결과: `P0_1_EVIDENCE_5_API.txt`

| 엔드포인트 | 메서드 | 인증 | 응답 상태 | 응답 요약 |
|-----------|--------|------|----------|----------|
| `/api/auth/me` | GET | Bearer JWT | 200 OK | 유저 프로필 JSON 반환 |
| `/api/users/discover` | GET | Bearer JWT | 200 OK | `{ users: [...], total, offset, limit }` |
| `/api/chat/conversations` | GET | Bearer JWT | 200 OK | `{ conversations: [...] }` |

**인증 없는 호출 시**: `/api/auth/me`는 401, `/api/users/discover`는 게스트 모드(데모+AI 유저만), `/api/chat/conversations`는 401 반환 — 모두 정상.

---

### 증빙 4: EXPO_PUBLIC_DOMAIN 환경값

> 상세 결과: `P0_1_EVIDENCE_4_ENV.txt`

| 파일 | 변수 | 현재 값 | 설명 |
|------|------|---------|------|
| `artifacts/lito/.env` | `EXPO_PUBLIC_DOMAIN` | 미설정 (localhost 폴백) | 배포 시 실제 도메인으로 설정 필요 |
| `artifacts/api-server/.env` | `DATABASE_URL` | `postgresql://lito_user:...@localhost:5432/lito_db` | 로컬 DB 연결 |
| `artifacts/api-server/.env` | `JWT_SECRET` | 설정됨 | 인증 토큰 서명 |

**배포 시 필수 설정**: `EXPO_PUBLIC_DOMAIN=api.lito-dating.com` (또는 실제 API 서버 도메인)

---

### 증빙 5: 실기기 테스트 한계 설명

샌드박스 환경에서는 iOS/Android 실기기 빌드 및 실행이 불가능합니다. 대신 다음으로 대체합니다:

1. **TypeScript 컴파일 검증**: 모든 변경 파일이 `typescript.transpileModule()` 통과
2. **API 서버 통합 테스트**: 실제 PostgreSQL DB + Express 서버에서 엔드포인트 응답 확인
3. **코드 경로 분석**: `mockData.ts` 참조 0건, 모든 화면이 `API_BASE` 기반 fetch 호출

**실기기 테스트 시나리오** (배포 후 수동 검증 필요):

| # | 시나리오 | 검증 포인트 |
|---|---------|-----------|
| 1 | 신규 이메일 가입 | 가입 → JWT 발급 → 프로필 생성 화면 진입 |
| 2 | 프로필 설정 완료 | 사진 업로드 → 기본 정보 입력 → discover 화면 진입 |
| 3 | discover 화면 로딩 | API에서 실제 유저 목록 로드 → 카드 렌더링 |
| 4 | discover 빈 상태 | 유저 0명일 때 "새로운 사람을 찾고 있어요" 메시지 표시 |
| 5 | discover 에러 상태 | 네트워크 OFF → 에러 메시지 + 재시도 버튼 표시 |
| 6 | 스와이프 like/pass | 서버에 POST 요청 → 카드 제거 → 매칭 시 모달 표시 |
| 7 | matches 화면 | 실제 매칭 데이터 로드 → 대화방 목록 렌더링 |
| 8 | chat 진입 | 대화방 메시지 로드 → 실시간 WebSocket 연결 |
| 9 | 메시지 전송/수신 | WebSocket으로 실시간 전송 → 읽음 표시 동작 |
| 10 | 백그라운드 복귀 | 앱 백그라운드 → 포그라운드 → WebSocket 재연결 + 데이터 새로고침 |

---

## 2. 리스크 수정 내역

### 2-1. WebSocket 재연결 및 백그라운드 복귀 안정성

**파일**: `artifacts/lito/context/AppContext.tsx`

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 재연결 딜레이 | 고정 3초 | 지수 백오프 (1s → 2s → 4s → 8s → 16s → 최대 30s) |
| 재시도 카운터 | 없음 | `reconnectAttemptRef` — 연결 성공 시 0으로 초기화 |
| 백그라운드 복귀 | 미처리 | `AppState.addEventListener("change")` — active 전환 시 즉시 재연결 + `fetchConversations()` |
| 활성 대화방 복구 | 미처리 | `ws.onopen`에서 `activeConvRef.current`가 있으면 자동 `join` 전송 |

### 2-2. 이미지 프리패칭 및 로딩 fallback

**파일**: `artifacts/lito/components/ProfileImage.tsx`

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 로드 실패 처리 | 없음 (깨진 이미지) | `onError` → `hasError=true` → placeholder 아이콘 표시 |
| 로딩 상태 | 없음 | `onLoadStart`/`onLoad` → `ActivityIndicator` 오버레이 |
| 캐시 정책 | 기본값 | `cachePolicy="memory-disk"` (expo-image) |
| 프리패치 | 없음 | `prefetchImages(urls)` 유틸 함수 export (discover 카드 프리패치용) |

### 2-3. HTTP 상태코드별 분기 처리

**파일**: `artifacts/lito/utils/apiClient.ts` (신규), `artifacts/lito/utils/photoUpload.ts` (수정)

| 상태코드 | apiClient.ts | photoUpload.ts |
|----------|-------------|---------------|
| 401 | `ApiError.isUnauthorized` | "로그인이 만료되었습니다" |
| 403 | `ApiError.isForbidden` | "업로드 권한이 없습니다" |
| 413 | — | "파일 크기가 너무 큽니다" |
| 429 | `ApiError.isRateLimited` + Retry-After 존중 | "요청이 너무 많습니다" + 자동 재시도 |
| 5xx | `ApiError.isServerError` + 자동 재시도 | "서버 오류" + 자동 재시도 |
| 네트워크 실패 | `NetworkError` + 자동 재시도 | `UploadError(retryable=true)` |

**재시도 정책**: 최대 2회, 지수 백오프 (1s → 2s), 429는 `Retry-After` 헤더 존중.

---

## 3. aiPersonas.ts 격리

### 문제

AI 페르소나(미오, 지아)와 데모 유저(유나, 타쿠야 등)가 실제 유저 데이터와 섞여서 discover/matches/chat에 노출됨. 프론트엔드와 백엔드 양쪽 모두에서 발생.

### 해결: Feature Flag 기반 격리

| 위치 | 환경변수 | 기본값 | 프로덕션 설정 |
|------|---------|--------|-------------|
| 백엔드 `users.ts` | `ENABLE_AI_PERSONAS` | `true` | `false` |
| 백엔드 `users.ts` | `ENABLE_DEMO_USERS` | `true` | `false` |
| 프론트엔드 `AppContext.tsx` | `EXPO_PUBLIC_ENABLE_AI_PERSONAS` | `true` | `false` |

**동작 방식**:
- `ENABLE_AI_PERSONAS=false` → 백엔드 discover API에서 AI 유저 풀 제외
- `ENABLE_DEMO_USERS=false` → 백엔드 discover API에서 데모 유저 풀 제외
- `EXPO_PUBLIC_ENABLE_AI_PERSONAS=false` → 프론트엔드 초기 대화방 목록에서 AI 대화방 제외

**검증**: feature flag가 `false`일 때 AI/데모 유저가 discover 응답에 포함되지 않음을 코드 경로로 확인.

---

## 4. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `artifacts/lito/context/AppContext.tsx` | 수정 | WebSocket 지수 백오프, AppState 리스너, AI feature flag |
| `artifacts/lito/components/ProfileImage.tsx` | 수정 | onError fallback, 로딩 상태, prefetch 유틸 |
| `artifacts/lito/utils/apiClient.ts` | **신규** | HTTP 상태코드별 분기 + 재시도 유틸 |
| `artifacts/lito/utils/photoUpload.ts` | 수정 | 401/403/429 분기 + 재시도 로직 |
| `artifacts/api-server/src/routes/users.ts` | 수정 | AI/데모 유저 feature flag 격리 |
| `artifacts/api-server/src/ws.ts` | 수정 | (이전 커밋에서 빌드 에러 수정) |
| `P0_1_EVIDENCE_1_GREP.txt` | **신규** | 증빙 1 결과 |
| `P0_1_EVIDENCE_4_ENV.txt` | **신규** | 증빙 4 결과 |
| `P0_1_EVIDENCE_5_API.txt` | **신규** | 증빙 5 결과 |

---

## 5. 배포 체크리스트

- [ ] `EXPO_PUBLIC_DOMAIN` 설정 (실제 API 서버 도메인)
- [ ] `EXPO_PUBLIC_ENABLE_AI_PERSONAS=false` 설정 (프로덕션)
- [ ] `ENABLE_AI_PERSONAS=false` 설정 (API 서버 프로덕션)
- [ ] `ENABLE_DEMO_USERS=false` 설정 (API 서버 프로덕션)
- [ ] API 서버 빌드 및 배포 (`npm run build`)
- [ ] Expo 앱 빌드 (`eas build`)
- [ ] 실기기에서 10개 테스트 시나리오 수동 검증
- [ ] `mockData.ts` 파일 삭제 (선택 — 참조 0건이므로 빌드에 미포함)

---

## 6. 남은 리스크

| # | 리스크 | 심각도 | 대응 |
|---|-------|--------|------|
| 1 | GCS 버킷 미설정 → 사진 업로드 불가 | **P0** | P0-2에서 해결 |
| 2 | 실기기 테스트 미완료 | 중 | 배포 후 수동 검증 필요 |
| 3 | `apiClient.ts`가 아직 모든 화면에 적용되지 않음 | 낮 | 점진적 마이그레이션 가능 |
| 4 | AI 페르소나 like/pass/matches 라우트에도 feature flag 미적용 | 낮 | 프로덕션에서 AI 유저 ID가 discover에 안 나오므로 자연 차단 |
