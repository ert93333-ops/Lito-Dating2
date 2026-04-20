# Tech

---

## 폴더 목적

LITO 시스템의 아키텍처, 인프라, 보안 결정, API 명세, 환경변수, EAS 빌드 절차를 관리한다.
기술 결정의 근거와 이력을 누적하여 팀 간 컨텍스트를 공유한다.

---

## 담당 팀

| 팀 | 역할 |
|---|---|
| 04_기술팀 | 아키텍처 설계, 구현, API 명세 관리, 보안 대응, 빌드/배포 |
| 00_지휘본부 | 보안 결정 및 주요 아키텍처 변경 승인 |
| 05_정책팀 | 개인정보 관련 기술 결정 정책 문서와 동기화 |

---

## 폴더 구조

```
tech/
  README.md           — 이 파일
  architecture.md     — 전체 시스템 아키텍처 다이어그램 및 설명
  api_spec.md         — API 엔드포인트 명세
  env_vars.md         — 필수 환경변수 목록 및 설정 가이드
  security.md         — 보안 결정 사항 및 취약점 대응 기록
  eas_build.md        — EAS 빌드 및 배포 절차
  database.md         — DB 스키마 변경 이력 및 마이그레이션 규칙
```

---

## 스택 요약

| 레이어 | 기술 |
|---|---|
| 모바일 | Expo (React Native), expo-router |
| 백엔드 | Node.js, Express, TypeScript |
| DB | PostgreSQL (Drizzle ORM) |
| AI | OpenAI API (GPT-4o) |
| 실시간 | WebSocket (ws) |
| 인증 | JWT (SESSION_SECRET), Google OAuth, Kakao, LINE |
| 스토리지 | Replit Object Storage |
| 빌드 | EAS (Expo Application Services) |

---

## 필수 환경변수

| 변수명 | 필수 여부 | 설명 |
|---|---|---|
| DATABASE_URL | 필수 (항상) | PostgreSQL 연결 문자열 |
| SESSION_SECRET | 필수 (production) | JWT 서명 키. 미설정 시 production 부팅 차단. |
| PORT | 필수 (항상) | API 서버 포트. 미설정 시 부팅 차단. |
| DEFAULT_OBJECT_STORAGE_BUCKET_ID | 필수 | 오브젝트 스토리지 버킷 ID |
| PRIVATE_OBJECT_DIR | 필수 | 비공개 오브젝트 디렉토리 |
| PUBLIC_OBJECT_SEARCH_PATHS | 필수 | 공개 오브젝트 검색 경로 |
| GOOGLE_CLIENT_SECRET | 필수 | Google OAuth 클라이언트 시크릿 |
| EXPO_PUBLIC_DOMAIN | 권장 | 클라이언트가 API 서버에 접근하는 도메인 |

---

## 보안 결정 사항

| 항목 | 결정 | 날짜 | 상태 |
|---|---|---|---|
| Apple Sign-In | JWKS 검증 없음으로 임시 비활성화 (503 반환) | 2026-04-19 | CONFIRMED |
| SESSION_SECRET | production 미설정 시 서버 부팅 차단 | 2026-04-19 | CONFIRMED |
| 전화번호 저장 | SHA-256 해시만 저장, 원본 미보관 | 2026-04-19 | CONFIRMED |
| /api/ai/* 인증 | 모든 AI 엔드포인트 requireAuth 적용 | 2026-04-19 | CONFIRMED |

---

## EAS 빌드 절차 (요약)

1. `eas login` — Expo 계정 로그인
2. `eas init` — projectId 획득 후 `app.json` 의 `extra.eas.projectId` 실제 값으로 교체
3. `eas build --profile development --platform ios` — 개발 빌드 (시뮬레이터)
4. `eas build --profile preview --platform android` — 내부 테스트용 APK
5. `eas build --profile production --platform all` — 스토어 배포 빌드
6. 상세 내용: `docs/tech/eas_build.md` 참조

---

## 업데이트 규칙

1. DB 스키마 변경 시 `database.md` 에 변경 내용과 마이그레이션 절차를 기록한다.
2. 보안 결정은 `security.md` 에 기록하고 `docs/decision_log.md` 와 동기화한다.
3. 환경변수 추가/삭제 시 `env_vars.md` 를 즉시 업데이트한다.
4. API 엔드포인트 추가/변경 시 `api_spec.md` 를 코드 반영과 동시에 업데이트한다.
