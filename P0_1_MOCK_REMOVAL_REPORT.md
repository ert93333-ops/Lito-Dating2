# P0-1: Mock 데이터 완전 제거 및 핵심 화면 API 연동 결과 보고서

## 1. 변경 파일 목록

| 파일 경로 | 주요 변경 사항 |
|-----------|----------------|
| `artifacts/lito/context/AppContext.tsx` | `mockData.ts` import 완전 제거. `fetchDiscover`, `fetchConversations`, `loadConversationMessages` 등 실제 API 호출 함수로 상태 관리 전면 개편. 로딩 및 에러 상태(`discoverLoading`, `discoverError`, `matchesLoading`) 추가. |
| `artifacts/lito/app/(tabs)/discover.tsx` | 네트워크 실패 시 앱이 죽지 않도록 `discoverError` 상태 기반의 에러 UI 및 재시도 버튼 추가. |
| `artifacts/lito/app/(tabs)/matches.tsx` | `matchesLoading` 로딩 상태 UI 추가. 화면 포커스 시 `fetchConversations`를 호출하여 최신 매칭 데이터를 서버에서 로드하도록 수정. |
| `artifacts/lito/app/chat/[id].tsx` | `CURRENT_USER_ID = "me"` 하드코딩 제거. `profile.id`를 기반으로 현재 사용자 식별하도록 수정. |
| `artifacts/lito/services/prsSignals.ts` | `MY_ID` 상수 제거. 함수 파라미터로 `myUserId`를 전달받아 처리하도록 수정. |
| `artifacts/lito/data/aiPersonas.ts` | (신규) `mockData.ts`에 있던 AI 페르소나 대화방 데이터를 독립된 상수로 분리하여 실제 API 연동과 무관하게 동작하도록 분리. |
| `P0_MOCK_REMOVAL_NOTES.md` | (신규) Mock 의존성 분석 결과 기록. |

## 2. 제거한 Mock 의존성 목록

- `artifacts/lito/data/mockData.ts` 파일에 대한 모든 `import` 참조 제거 (프로덕션 빌드 참조 0건 검증 완료).
- `AppContext.tsx`의 초기 상태에 하드코딩되어 있던 `myProfile`, `MOCK_USERS`, `mockConversations`, `mockMatches` 제거.
- `chat/[id].tsx` 및 `prsSignals.ts`에 하드코딩되어 있던 `CURRENT_USER_ID = "me"` 제거.

## 3. 화면별 호출 API 목록

| 화면 | 호출 API 엔드포인트 | 설명 |
|------|---------------------|------|
| **Discover** (`discover.tsx`) | `GET /api/users/discover` | 추천 유저 목록 로드 (필터 적용 포함) |
| **Matches** (`matches.tsx`) | `GET /api/chat/conversations` | 매칭 및 대화방 목록 로드 |
| **Chat** (`chat/[id].tsx`) | `GET /api/chat/:id/messages` | 특정 대화방의 메시지 목록 로드 |
| **Profile Setup** (`profile-setup.tsx`) | `POST /api/auth/profile` | 프로필 생성 및 업데이트 (기존 연동 유지) |
| **Login** (`login.tsx`) | `POST /api/auth/login`, `POST /api/auth/register` | 이메일 로그인/가입 (기존 연동 유지) |
| **App Init** (`AppContext.tsx`) | `GET /api/auth/me` | 앱 실행 시 현재 로그인한 사용자 프로필 정보 로드 |

## 4. 테스트 시나리오 10개

1. **신규 가입 및 프로필 생성**: 신규 계정으로 가입 후 프로필을 설정하면 `GET /api/auth/me`를 통해 `profile` 상태가 정상적으로 초기화되는가?
2. **Discover 로딩 상태**: Discover 화면 진입 시 API 응답 전까지 "추천 찾는 중..." 로딩 UI가 노출되는가?
3. **Discover 에러 상태**: 네트워크 단절 상태에서 Discover 화면 진입 시 앱이 크래시되지 않고 "연결할 수 없어요" 에러 UI와 "다시 시도" 버튼이 노출되는가?
4. **Discover 데이터 렌더링**: `GET /api/users/discover` 응답 데이터가 실제 카드 스택으로 정상 렌더링되는가?
5. **Matches 로딩 상태**: Matches 화면 진입 시 API 응답 전까지 "매칭 불러오는 중..." 로딩 UI가 노출되는가?
6. **Matches 데이터 렌더링**: `GET /api/chat/conversations` 응답 데이터가 새 매칭 및 이전 매칭 목록으로 정상 분류되어 렌더링되는가?
7. **Matches 최신화**: Matches 화면에 포커스가 갈 때마다 `fetchConversations`가 호출되어 최신 상태가 반영되는가?
8. **Chat 진입 및 메시지 로드**: 특정 대화방 진입 시 `GET /api/chat/:id/messages`를 호출하여 메시지 목록을 정상적으로 불러오는가?
9. **Chat 본인 메시지 식별**: `profile.id`를 기반으로 본인이 보낸 메시지가 우측(Me) 버블로 정상 렌더링되는가?
10. **Mock 데이터 참조 0건**: 앱 실행 중 어떤 화면에서도 하드코딩된 `mockData.ts`의 데이터(예: "지수", "Kenji" 등 가짜 유저)가 노출되지 않는가?

## 5. 남은 리스크

- **WebSocket 연동 불안정성**: 현재 `AppContext.tsx`에서 REST API 기반으로 데이터를 로드하도록 수정했으나, 실시간 메시지 수신 및 읽음 처리 등을 위한 WebSocket(`ws.ts`) 연동이 완벽하게 테스트되지 않았습니다. 실시간 양방향 통신에 대한 추가 검증이 필요합니다.
- **이미지 로딩 지연**: 실제 API에서 반환하는 프로필 이미지 URL(S3/GCS)의 로딩 속도에 따라 Discover 카드 스와이프 시 이미지가 늦게 뜨는 현상이 발생할 수 있습니다. 이미지 프리패칭(Prefetching) 로직 추가가 필요할 수 있습니다.
- **에러 핸들링 세분화**: 현재는 네트워크 에러 시 통합된 에러 메시지를 보여주지만, 401(인증 만료), 403(권한 없음), 429(Rate Limit) 등 HTTP 상태 코드별 세분화된 에러 핸들링 및 리다이렉트 로직이 부족합니다.

## 6. 배포 체크리스트

- [x] `mockData.ts` import 참조 0건 확인
- [x] `CURRENT_USER_ID` 하드코딩 제거 확인
- [x] TypeScript 컴파일 에러 없음 확인 (`tsc --noEmit`)
- [ ] (배포 전) `EXPO_PUBLIC_DOMAIN` 환경변수가 프로덕션 API 서버 URL로 올바르게 설정되어 있는지 확인
- [ ] (배포 전) API 서버가 정상적으로 배포되어 가동 중인지 확인
- [ ] (배포 전) 실제 기기(iOS/Android)에서 네트워크 단절 테스트 수행하여 크래시 여부 확인
