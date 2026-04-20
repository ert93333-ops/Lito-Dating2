# Decision Log

Lito 프로젝트의 주요 의사결정 기록.
새 결정은 최상단에 추가한다 (역순 정렬).

---

## 형식

| 항목 | 내용 |
|---|---|
| 날짜 | YYYY-MM-DD |
| 결정사항 | 무엇을 결정했는가 |
| 근거 | 왜 그 결정을 내렸는가 (데이터, 인사이트, 제약 포함) |
| 영향받는 문서 | 관련 docs/ 경로 |
| 담당 채팅 | 해당 결정이 이루어진 Replit 채팅 세션 제목 또는 날짜 |

---

## 기록

---

### 2026-04-19 — Sprint 0: Apple Sign-In 임시 비활성화

| 항목 | 내용 |
|---|---|
| 결정사항 | Apple Sign-In을 production path에서 임시 비활성화 (503 반환) |
| 근거 | JWKS 기반 identityToken 검증 없이 client-supplied providerUserId를 신뢰하면 임의 UID로 계정 탈취 가능. Sprint 1에서 올바른 검증 구현 전까지 노출 금지. |
| 영향받는 문서 | docs/tech/README.md, docs/policy/README.md |
| 담당 채팅 | 2026-04-19 Sprint 0 런칭 블로커 제거 |

---

### 2026-04-19 — Sprint 0: SESSION_SECRET 프로덕션 필수화

| 항목 | 내용 |
|---|---|
| 결정사항 | NODE_ENV !== 'development' 환경에서 SESSION_SECRET 미설정 시 서버 부팅 실패 |
| 근거 | 기존 코드에 "lito-dev-secret-change-in-prod" 폴백이 하드코딩되어 있어 JWT 위조 가능. 개발 환경에서만 경고 출력 후 허용. |
| 영향받는 문서 | docs/tech/README.md |
| 담당 채팅 | 2026-04-19 Sprint 0 런칭 블로커 제거 |

---

### 2026-04-19 — 성별 필터 매칭 추가

| 항목 | 내용 |
|---|---|
| 결정사항 | discover 필터에 gender(전체/여성/남성) 추가. user_profiles.gender 컬럼, API 파라미터, 클라이언트 UI 동시 적용. |
| 근거 | 데이팅 앱에서 성별 필터는 기본 UX 요소. 미구현 상태에서 사용자 이탈 위험. |
| 영향받는 문서 | docs/product/README.md, docs/ux/README.md |
| 담당 채팅 | 2026-04-19 성별 필터 구현 |

---

### 2026-04-19 — 연락처 차단 기능 구현

| 항목 | 내용 |
|---|---|
| 결정사항 | 원본 전화번호는 기기 밖으로 나가지 않는다. SHA-256 해시만 서버로 전송. |
| 근거 | 개인정보 보호 원칙. 번호 유출 시 법적 리스크 및 신뢰 훼손. |
| 영향받는 문서 | docs/policy/README.md, docs/tech/README.md |
| 담당 채팅 | 2026-04-19 연락처 차단 구현 |

---

### 2026-04-19 — 도메인 확정: litodate.app

| 항목 | 내용 |
|---|---|
| 결정사항 | 서비스 도메인을 litodate.app으로 확정 |
| 근거 | 브랜드명 Lito + date 조합. .app 도달 TLD로 신뢰성 확보. |
| 영향받는 문서 | docs/product/README.md |
| 담당 채팅 | 2026-04-19 프로젝트 초기 설정 |
