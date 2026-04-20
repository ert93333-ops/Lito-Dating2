# Decision Log

LITO 프로젝트의 주요 의사결정 기록.
새 결정은 최상단에 추가한다 (역순 정렬).
모든 팀은 제품/기술/정책 방향에 영향을 주는 결정을 반드시 여기에 기록해야 한다.

---

## 형식

| 필드 | 설명 |
|---|---|
| 날짜 | YYYY-MM-DD |
| 결정사항 | 무엇을 결정했는가 |
| 근거 | 왜 그 결정을 내렸는가 (데이터, 인사이트, 제약 포함) |
| 영향받는 문서 | 관련 docs/ 경로 |
| 담당 채팅 | 해당 결정이 이루어진 Replit 채팅 세션 제목 또는 날짜 |
| 상태 | CONFIRMED / PENDING_REVIEW / SUPERSEDED |

---

## 상태 정의

- **CONFIRMED** — 결정이 확정되어 코드/문서에 반영 완료
- **PENDING_REVIEW** — 결정됐으나 지휘부 검토 또는 추가 검증 필요
- **SUPERSEDED** — 이후 결정으로 무효화됨 (대체 결정 링크 기재)

---

## 기록

---

### 2026-04-19 — docs 지휘 구조 초기화

| 필드 | 내용 |
|---|---|
| 날짜 | 2026-04-19 |
| 결정사항 | /docs 하위에 research / product / policy / ux / ai / tech / growth 7개 도메인 폴더 생성, 각 폴더에 README + 담당 팀 명시 |
| 근거 | 다중 전문 팀(리서치, 제품, 기술, 성장 등)이 같은 프로젝트에서 작업할 때 결과물 누락 및 충돌 방지 필요 |
| 영향받는 문서 | docs/ 전체 |
| 담당 채팅 | 2026-04-19 00_지휘본부 초기화 |
| 상태 | CONFIRMED |

---

### 2026-04-19 — Sprint 0: Apple Sign-In 임시 비활성화

| 필드 | 내용 |
|---|---|
| 날짜 | 2026-04-19 |
| 결정사항 | Apple Sign-In을 production path에서 임시 비활성화 (503 반환) |
| 근거 | JWKS 기반 identityToken 검증 없이 client-supplied providerUserId를 신뢰하면 임의 UID로 계정 탈취 가능. Sprint 1에서 올바른 검증 구현 전까지 노출 금지. |
| 영향받는 문서 | docs/tech/README.md, docs/policy/README.md |
| 담당 채팅 | 2026-04-19 Sprint 0 런칭 블로커 제거 |
| 상태 | CONFIRMED |

---

### 2026-04-19 — Sprint 0: SESSION_SECRET 프로덕션 필수화

| 필드 | 내용 |
|---|---|
| 날짜 | 2026-04-19 |
| 결정사항 | NODE_ENV !== 'development' 환경에서 SESSION_SECRET 미설정 시 서버 부팅 실패 |
| 근거 | 기존 코드에 "lito-dev-secret-change-in-prod" 폴백이 하드코딩되어 JWT 위조 가능. 개발 환경에서만 경고 출력 후 허용. |
| 영향받는 문서 | docs/tech/README.md |
| 담당 채팅 | 2026-04-19 Sprint 0 런칭 블로커 제거 |
| 상태 | CONFIRMED |

---

### 2026-04-19 — Sprint 0: /api/ai/* 전체 인증 강제

| 필드 | 내용 |
|---|---|
| 날짜 | 2026-04-19 |
| 결정사항 | coaching 라우터의 모든 /ai/* 엔드포인트에 requireAuth 적용 |
| 근거 | 비인증 사용자가 OpenAI API를 무단 사용할 수 있는 취약점 존재 |
| 영향받는 문서 | docs/tech/README.md, docs/ai/README.md |
| 담당 채팅 | 2026-04-19 Sprint 0 런칭 블로커 제거 |
| 상태 | CONFIRMED |

---

### 2026-04-19 — 성별 필터 매칭 추가

| 필드 | 내용 |
|---|---|
| 날짜 | 2026-04-19 |
| 결정사항 | discover 필터에 gender(전체/여성/남성) 추가. user_profiles.gender 컬럼, API 파라미터, 클라이언트 UI 동시 적용. |
| 근거 | 데이팅 앱에서 성별 필터는 기본 UX 요소. 미구현 상태에서 사용자 이탈 위험. |
| 영향받는 문서 | docs/product/README.md, docs/ux/README.md |
| 담당 채팅 | 2026-04-19 성별 필터 구현 |
| 상태 | CONFIRMED |

---

### 2026-04-19 — 연락처 차단: 원본 전화번호 서버 전송 금지

| 필드 | 내용 |
|---|---|
| 날짜 | 2026-04-19 |
| 결정사항 | 원본 전화번호는 기기 밖으로 나가지 않는다. SHA-256 해시만 서버로 전송. |
| 근거 | 개인정보 보호 원칙. 번호 유출 시 법적 리스크 및 신뢰 훼손. |
| 영향받는 문서 | docs/policy/README.md, docs/tech/README.md |
| 담당 채팅 | 2026-04-19 연락처 차단 구현 |
| 상태 | CONFIRMED |

---

### 2026-04-19 — 도메인 확정: litodate.app

| 필드 | 내용 |
|---|---|
| 날짜 | 2026-04-19 |
| 결정사항 | 서비스 도메인을 litodate.app으로 확정 |
| 근거 | 브랜드명 Lito + date 조합. .app TLD로 신뢰성 확보. |
| 영향받는 문서 | docs/product/README.md |
| 담당 채팅 | 2026-04-19 프로젝트 초기 설정 |
| 상태 | CONFIRMED |
