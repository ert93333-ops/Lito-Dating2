# P0-2: GCS/로컬 스토리지 리팩터링 + 다중 사진 업로드 UX — 결과 보고서

**커밋**: `4a6a6bc`
**날짜**: 2026-04-16

---

## 1. 변경 파일 목록

| 경로 | 변경 내용 |
|------|----------|
| `artifacts/api-server/src/lib/objectStorage.ts` | Replit 사이드카(127.0.0.1:1106) 의존 완전 제거. GCS Service Account 기반 presigned URL + 로컬 파일시스템 폴백 이중 모드 구현 |
| `artifacts/api-server/src/routes/storage.ts` | presigned URL 요청, 로컬 업로드, 삭제, 서빙 엔드포인트 정비 |
| `artifacts/lito/app/profile-edit.tsx` | 다중 사진 관리 UI 전면 리팩터링 (최대 6장, 삭제, 순서 변경, 업로드 실패 재시도) |
| `artifacts/lito/app/profile-setup.tsx` | 업로드 실패 상태 추가 + 재시도 버튼 UI |
| `artifacts/lito/utils/photoUpload.ts` | 401/403/429 상태코드별 분기 + 자동 재시도 (지수 백오프, 최대 2회) |
| `artifacts/lito/components/ProfileImage.tsx` | onError fallback + 로딩 상태 + prefetch 지원 |
| `artifacts/lito/utils/apiClient.ts` | HTTP 상태코드별 분기 유틸리티 (신규) |
| `docs/GCS_BUCKET_SETUP.md` | GCS 버킷 생성/권한 설정 가이드 (신규) |
| `artifacts/lito/app/(tabs)/discover.tsx` | localhost:8080 → 3000 |
| `artifacts/lito/app/(tabs)/matches.tsx` | localhost:8080 → 3000 |
| `artifacts/lito/app/ai-photo.tsx` | localhost:8080 → 3000 |
| `artifacts/lito/app/chat/[id].tsx` | localhost:8080 → 3000 |
| `artifacts/lito/app/login.tsx` | localhost:8080 → 3000 |
| `artifacts/lito/app/report-user.tsx` | localhost:8080 → 3000 |
| `artifacts/lito/app/settings.tsx` | localhost:8080 → 3000 |
| `artifacts/lito/context/AppContext.tsx` | localhost:8080 → 3000 (HTTP + WebSocket) |

---

## 2. 업로드 플로우 E2E 검증 결과

### 로컬 모드 (GCS 미설정 시)

| 단계 | 엔드포인트 | 결과 |
|------|-----------|------|
| presigned URL 요청 | `POST /api/storage/uploads/request-url` | 200 — `uploadURL: http://localhost:3000/api/storage/local-upload/{uuid}` |
| 파일 업로드 | `PUT /api/storage/local-upload/{uuid}` | 200 — `{"ok":true}` |
| 파일 서빙 | `GET /api/storage/objects/uploads/{uuid}` | 200 — 2048 bytes |
| 파일 삭제 | `DELETE /api/storage/objects/uploads/{uuid}` | 200 — `{"ok":true}` |
| 삭제 후 서빙 | `GET /api/storage/objects/uploads/{uuid}` | 404 |

### GCS 모드 (프로덕션)

GCS 모드는 `GCS_BUCKET_NAME` + `GOOGLE_APPLICATION_CREDENTIALS` 환경변수 설정 시 자동 활성화됩니다.
presigned URL은 GCS v4 signed URL (15분 유효)로 반환되며, 클라이언트가 직접 GCS에 PUT 업로드합니다.

---

## 3. 화면별 호출 API 목록

### profile-setup.tsx (프로필 생성)

| 동작 | API |
|------|-----|
| 사진 선택 → 업로드 | `POST /api/storage/uploads/request-url` → `PUT {uploadURL}` |
| 프로필 저장 | `POST /api/auth/profile` |
| 업로드 실패 재시도 | 동일 플로우 반복 |

### profile-edit.tsx (프로필 수정)

| 동작 | API |
|------|-----|
| 사진 추가 (최대 6장) | `POST /api/storage/uploads/request-url` → `PUT {uploadURL}` |
| 사진 삭제 | `DELETE /api/storage/objects/uploads/{uuid}` |
| 사진 순서 변경 | 클라이언트 상태만 변경 → 저장 시 `PUT /api/auth/profile` |
| 업로드 실패 재시도 | 빨간 오버레이 탭 → 재업로드 |
| 프로필 저장 | `PUT /api/auth/profile` |

---

## 4. 테스트 시나리오

| # | 시나리오 | 예상 결과 | 검증 방법 |
|---|---------|----------|----------|
| 1 | 프로필 생성 시 메인 사진 1장 업로드 | 업로드 성공, 서빙 URL 반환 | presigned URL → PUT → GET 200 |
| 2 | 추가 사진 3장 업로드 | 각각 독립 업로드 성공 | 각 슬롯 서빙 확인 |
| 3 | 프로필 수정에서 사진 6장 채우기 | 6장 모두 업로드 성공, 추가 버튼 비활성화 | UI 확인 |
| 4 | 사진 삭제 | 서버에서 파일 삭제, UI에서 슬롯 비움 | DELETE 200 → GET 404 |
| 5 | 사진 순서 변경 (위/아래 버튼) | 배열 순서 변경, 저장 시 반영 | 프로필 조회 API로 순서 확인 |
| 6 | 업로드 실패 (네트워크 끊김) | 빨간 오버레이 + 재시도 버튼 표시 | 네트워크 OFF 후 업로드 시도 |
| 7 | 재시도 버튼 탭 | 재업로드 시도, 성공 시 정상 표시 | 네트워크 복구 후 재시도 |
| 8 | 10MB 초과 파일 업로드 | 413 에러, "파일 크기가 너무 큽니다" 알림 | 큰 파일 선택 |
| 9 | JWT 만료 후 업로드 | 401 에러, "로그인이 만료되었습니다" 알림 | 만료 토큰으로 요청 |
| 10 | GCS 모드에서 presigned URL 업로드 | GCS signed URL 반환, 직접 GCS PUT | GCS_BUCKET_NAME 설정 후 테스트 |

---

## 5. 남은 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| GCS 프로덕션 테스트 미완료 | **높음** | GCS 버킷 생성 후 실제 signed URL 업로드 검증 필요 |
| 이미지 리사이징/압축 미구현 | 중간 | 현재 원본 그대로 업로드. expo-image-manipulator로 리사이즈 추가 권장 |
| CDN 미설정 | 중간 | GCS 앞에 Cloud CDN 또는 Cloudflare 설정 권장 |
| 사진 순서 변경이 드래그가 아닌 버튼 방식 | 낮음 | react-native-draggable-flatlist로 드래그 UX 개선 가능 |
| 프로필 수정 저장 API가 사진 URL 배열을 받는지 미확인 | **높음** | `PUT /api/auth/profile`이 photos 배열을 지원하는지 확인 필요 |

---

## 6. 배포 체크리스트

- [ ] GCS 버킷 생성 (`docs/GCS_BUCKET_SETUP.md` 참조)
- [ ] Service Account JSON 키 생성 및 서버에 배치
- [ ] 환경변수 설정: `GCS_BUCKET_NAME`, `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] `ENABLE_AI_PERSONAS=false` 설정 (프로덕션)
- [ ] `EXPO_PUBLIC_DOMAIN` 설정 (프로덕션 API 도메인)
- [ ] API 서버 재빌드 (`pnpm run build`)
- [ ] presigned URL → GCS PUT → 서빙 E2E 테스트
- [ ] 10MB 초과 파일 거부 확인
- [ ] CORS 설정 확인 (GCS 버킷에 앱 도메인 허용)
