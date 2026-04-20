# Tech

아키텍처, 인프라, 보안, API 명세, 환경변수 문서 저장소.

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

## 필수 환경변수 (현재)

| 변수명 | 필수 여부 | 설명 |
|---|---|---|
| `DATABASE_URL` | 필수 | PostgreSQL 연결 문자열 |
| `SESSION_SECRET` | 필수 (production) | JWT 서명 키. production에서 미설정 시 부팅 차단. |
| `PORT` | 필수 | API 서버 포트 (기본값 없음, 미설정 시 부팅 차단) |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | 필수 | 오브젝트 스토리지 버킷 ID |
| `PRIVATE_OBJECT_DIR` | 필수 | 비공개 오브젝트 디렉토리 |
| `PUBLIC_OBJECT_SEARCH_PATHS` | 필수 | 공개 오브젝트 검색 경로 |
| `GOOGLE_CLIENT_SECRET` | 필수 | Google OAuth 클라이언트 시크릿 |
| `EXPO_PUBLIC_DOMAIN` | 권장 | 클라이언트가 API 서버에 접근하는 도메인 |

---

## 보안 결정 사항 (현재)

| 항목 | 결정 | 날짜 |
|---|---|---|
| Apple Sign-In | JWKS 검증 없음으로 임시 비활성화 (503 반환) | 2026-04-19 |
| SESSION_SECRET | production 미설정 시 서버 부팅 차단 | 2026-04-19 |
| 전화번호 저장 | SHA-256 해시만 저장, 원본 미보관 | 2026-04-19 |
| /api/ai/* 인증 | 모든 AI 엔드포인트 requireAuth 적용 | 2026-04-19 |

---

## EAS 빌드 절차 (요약)

1. `eas login` — Expo 계정 로그인
2. `eas init` — projectId 획득 후 `app.json`의 `extra.eas.projectId` 업데이트
3. `eas build --profile development --platform ios` — 개발 빌드
4. `eas build --profile production --platform all` — 배포 빌드
5. 상세 내용: `docs/tech/eas_build.md` 참조

---

## 업데이트 규칙

1. DB 스키마 변경 시 `database.md` 에 변경 내용과 마이그레이션 명령을 기록한다.
2. 보안 결정(취약점 발견, 대응, 비활성화 등)은 `security.md` 에 기록하고 `docs/decision_log.md` 와 동기화한다.
3. 환경변수 추가/삭제 시 `env_vars.md` 를 즉시 업데이트한다.
4. API 엔드포인트 추가/변경 시 `api_spec.md` 를 코드 반영과 동시에 업데이트한다.
