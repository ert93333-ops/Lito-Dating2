# LITO 프로젝트 — docs 전체 파일 모음

생성일: 2026-04-20
파일 수: 13개

---

# 목차

1. docs/decision_log.md
2. docs/research/README.md
3. docs/research/templates/research_brief.md
4. docs/research/templates/interview_note.md
5. docs/research/templates/competitor_matrix.csv
6. docs/research/templates/review_mining_template.csv
7. docs/research/templates/hypothesis_log.md
8. docs/product/README.md
9. docs/policy/README.md
10. docs/ux/README.md
11. docs/ai/README.md
12. docs/tech/README.md
13. docs/growth/README.md

---
---

# [1] docs/decision_log.md

---

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

---
---

# [2] docs/research/README.md

---

# Research

---

## 폴더 목적

LITO 프로젝트의 모든 리서치 산출물을 보관한다.
사용자 인터뷰, 경쟁사 분석, 앱스토어 리뷰 마이닝, 가설 수립 및 검증 결과를 누적한다.
리서치 결과는 제품/UX/성장 팀의 의사결정 근거로 직접 사용된다.

---

## 담당 팀

| 팀 | 역할 |
|---|---|
| 01_리서치팀 | 인터뷰 수행, 경쟁사 분석, 리뷰 마이닝, 가설 관리 |
| 00_지휘본부 | 리서치 결과 검토, decision_log 반영 여부 판단 |
| 02_제품팀 | 리서치 결과를 PRD/로드맵에 반영 |

---

## 폴더 구조

```
research/
  README.md                  — 이 파일
  templates/                 — 재사용 가능한 리서치 템플릿
  interviews/                — 사용자 인터뷰 기록 (interview_note.md 형식)
  competitive/               — 경쟁사 분석 (competitor_matrix.csv 기반)
  review_mining/             — 앱스토어·커뮤니티 리뷰 분석
  hypotheses/                — 가설 로그 및 검증 결과
```

---

## 업데이트 규칙

1. 인터뷰 완료 후 48시간 이내에 `interviews/` 에 기록한다.
2. 파일명은 `YYYYMMDD_참여자코드.md` 형식을 따른다 (예: `20260419_KR_F_25.md`).
3. 경쟁사 매트릭스는 신규 앱 등장 또는 주요 업데이트 시 갱신한다.
4. 가설은 `hypotheses/hypothesis_log.md` 에 누적 기록하고, 검증 완료 시 결과와 다음 액션을 반드시 기입한다.
5. 리서치에서 도출된 주요 결정은 `docs/decision_log.md` 에 반영한다.
6. 원본 데이터(녹취, 스크린샷 등)는 외부 스토리지 링크로 참조하고 이 저장소에 업로드하지 않는다.

---
---

# [3] docs/research/templates/research_brief.md

---

# Research Brief

> 개별 리서치 프로젝트를 시작할 때 이 파일을 복사해서 사용한다.
> 파일명: `YYYYMMDD_브리프제목.md`
> 담당: 01_리서치팀

---

## 메타

| 항목 | 내용 |
|---|---|
| 작성일 | YYYY-MM-DD |
| 담당자 | |
| 관련 기능/스프린트 | |
| 마감 | YYYY-MM-DD |
| 상태 | DRAFT / IN_PROGRESS / COMPLETED |

---

## 배경

이 리서치가 필요한 이유와 현재 알고 있는 것, 모르는 것을 기술한다.

---

## 리서치 목표

이 리서치를 통해 답하려는 질문 3~5개를 나열한다.

1.
2.
3.

---

## 방법론

- [ ] 사용자 인터뷰
- [ ] 설문
- [ ] 앱스토어 리뷰 마이닝
- [ ] 경쟁사 분석
- [ ] 내부 데이터 분석
- [ ] 기타:

---

## 참여자 기준

인터뷰/설문 참여자 모집 기준 (국가, 연령대, 데이팅앱 사용 경험 등).

---

## 일정

| 단계 | 기간 |
|---|---|
| 준비 | |
| 수행 | |
| 분석 | |
| 공유 | |

---

## 예상 산출물

- [ ]
- [ ]

---

## 결과 요약

*(리서치 완료 후 작성)*

### 주요 발견

### 인사이트

### 권장 액션

### 관련 가설 업데이트

`docs/research/hypotheses/hypothesis_log.md` 의 어떤 가설이 업데이트되었는지 기록.

### decision_log 반영 여부

`docs/decision_log.md` 에 기록할 결정이 있다면 여기에 초안 작성 후 00_지휘본부에 판정 요청.

---
---

# [4] docs/research/templates/interview_note.md

---

# Interview Note

> 사용자 인터뷰 1건당 이 파일을 복사해서 사용한다.
> 파일명: `YYYYMMDD_참여자코드.md` (예: `20260419_KR_F_25.md`)
> 보관 위치: `docs/research/interviews/`
> 담당: 01_리서치팀

---

## 참여자 정보

| 항목 | 내용 |
|---|---|
| 코드명 | (예: KR_F_25 = 한국/여성/25세) |
| 국가 | KR / JP |
| 성별 | |
| 연령대 | |
| 데이팅 앱 사용 경험 | |
| 현재 사용 앱 | |
| 인터뷰 날짜 | YYYY-MM-DD |
| 인터뷰 방식 | 대면 / 화상 / 텍스트 |
| 소요 시간 | |
| 원본 녹취 링크 | |

---

## 스크리너 응답 요약

참여자 선발 시 확인한 주요 응답을 간략히 기술.

---

## 인터뷰 기록

### 오프닝

*(현재 상황, 데이팅 앱 사용 패턴 등)*

---

### 주제별 기록

#### 주제 1:

**질문:**

**응답 (핵심 발언 그대로):**

> "..."

**관찰 메모:**

---

#### 주제 2:

**질문:**

**응답:**

> "..."

**관찰 메모:**

---

#### 주제 3:

**질문:**

**응답:**

> "..."

**관찰 메모:**

---

### 클로징

*(다음에 기대하는 것, 추가 의견 등)*

---

## 분석 메모

### 핵심 Pain Point

1.
2.
3.

### 주목할 발언 (Quote)

> "..."

### 인사이트

### 후속 확인 필요 사항

### 연결되는 가설

`hypothesis_log.md` 의 어떤 가설(H-NNN)과 관련 있는지 기록.

---
---

# [5] docs/research/templates/competitor_matrix.csv

```csv
앱명,국가타겟,주력기능,AI기능,번역지원,안티스캠,신뢰시스템,수익모델,앱스토어평점(KR),앱스토어평점(JP),MAU추정,최근업데이트,강점,약점,비고
Lito,KR-JP,AI문화매칭+번역,AI답장제안+번역+코칭,KR-JP실시간,안티스캠방어+연락처차단,PRS+신원인증,프리미엄구독,,,,2026-04,문화특화+AI,신규앱,자사
Pairs,JP-KR,진지한만남,없음,제한적,기본,실명인증,구독+코인,4.3,4.4,1000만+,2024-12,일본1위 브랜드력,AI없음,
Tapple,JP,가벼운만남,없음,없음,기본,나이인증,구독+코인,,4.2,500만+,2024-11,일본 10-20대 인지도,번역없음,
With,KR,성격매칭,MBTI분석,없음,기본,없음,구독+코인,4.1,,200만+,2024-10,MBTI 특화,한국 한정,
Hinge,글로벌,진지한만남,AI프롬프트,없음,기본,없음,구독,3.9,4.0,1000만+,2025-01,글로벌 브랜드,한일 문화 미특화,
Bumble,글로벌,여성우선,없음,없음,기본,사진인증,구독,3.8,3.9,5000만+,2025-01,여성 안전 이미지,번역없음,
Tinder,글로벌,범용,없음,없음,기본,없음,구독+코인,3.5,3.6,5억+,2025-01,최대 MAU,스캠 많음,
```

---
---

# [6] docs/research/templates/review_mining_template.csv

```csv
수집일,앱명,플랫폼,국가,별점,원문,번역요약,감성,카테고리,키워드,Pain_Point,Wish,관련가설ID,수집자
2026-04-19,경쟁앱예시,AppStore,KR,2,"번역이 어색해서 대화하기 힘들어요","번역 품질 불만",부정,번역품질,"번역 어색 대화",번역 품질이 낮아 대화 단절,네이티브급 자연스러운 번역,H-001,01_리서치팀
```

---
---

# [7] docs/research/templates/hypothesis_log.md

---

# Hypothesis Log

LITO 제품 가설의 누적 기록.
새 가설은 최하단에 추가한다.
검증 완료 시 상태를 업데이트하고 결과와 다음 액션을 기입한다.

담당: 01_리서치팀 (수립) / 02_제품팀 (우선순위) / 00_지휘본부 (검증 완료 확인)

---

## 형식

| 필드 | 설명 |
|---|---|
| ID | H-NNN (순번) |
| 분류 | 성장 / 유지 / 핵심기능 / 수익 / 신뢰 |
| 가설문 | "우리는 [대상]이 [행동]을 할 것이라고 믿는다. 왜냐하면 [근거]." |
| 검증 방법 | 인터뷰 / A/B 테스트 / 데이터 분석 / 리뷰 마이닝 |
| 성공 지표 | 어떤 수치가 어느 수준이면 가설이 맞다고 볼 것인가 |
| 상태 | 미검증 / 검증중 / 확인됨 / 기각됨 |
| 검증 결과 | 검증 완료 후 작성 |
| 다음 액션 | 검증 결과에 따른 후속 조치 |
| 관련 문서 | 근거 파일 경로 |

---

## 가설 목록

---

### H-001 — 번역 품질이 매칭 지속에 직접 영향을 미친다

| 필드 | 내용 |
|---|---|
| 분류 | 핵심기능 |
| 가설문 | 한국-일본 커플이 대화를 지속하지 못하는 주요 원인은 언어 장벽이며, AI 번역 품질이 높아지면 대화 지속율이 30% 이상 향상될 것이다. |
| 검증 방법 | 리뷰 마이닝(경쟁사) + 사용자 인터뷰 |
| 성공 지표 | 인터뷰 참여자 5명 중 3명 이상이 번역 품질을 Pain Point 1위로 언급 |
| 상태 | 미검증 |
| 검증 결과 | |
| 다음 액션 | |
| 관련 문서 | docs/research/review_mining/ |

---

### H-002 — 신뢰 지표가 첫 메시지 수신율을 높인다

| 필드 | 내용 |
|---|---|
| 분류 | 신뢰 |
| 가설문 | 프로필에 신뢰 점수(PRS)와 인증 배지가 표시되면 첫 메시지 수신율이 미인증 프로필 대비 40% 이상 높을 것이다. |
| 검증 방법 | A/B 테스트 (Closed Beta) |
| 성공 지표 | 인증 배지 프로필의 첫 메시지 수신율 >= 미인증 * 1.4 |
| 상태 | 미검증 |
| 검증 결과 | |
| 다음 액션 | |
| 관련 문서 | docs/product/README.md |

---

### H-003 — AI 답장 제안이 D7 유지율을 높인다

| 필드 | 내용 |
|---|---|
| 분류 | 유지 |
| 가설문 | AI 답장 제안을 사용한 유저는 사용하지 않은 유저 대비 7일 유지율이 20% 이상 높을 것이다. |
| 검증 방법 | 기능 사용 여부 코호트 분석 |
| 성공 지표 | D7 retention: AI 사용 코호트 >= 미사용 코호트 * 1.2 |
| 상태 | 미검증 |
| 검증 결과 | |
| 다음 액션 | |
| 관련 문서 | docs/ai/README.md |

---
---

# [8] docs/product/README.md

---

# Product

---

## 폴더 목적

LITO 제품의 전략, 로드맵, 기능 명세, KPI, 페르소나를 관리한다.
리서치 인사이트를 제품 결정으로 변환하는 허브 역할을 한다.

---

## 담당 팀

| 팀 | 역할 |
|---|---|
| 02_제품팀 | PRD 작성, 로드맵 관리, KPI 정의, 우선순위 결정 |
| 00_지휘본부 | 스프린트 범위 승인, 로드맵 검토 |
| 01_리서치팀 | 리서치 결과를 PRD 배경 섹션에 반영 |
| 03_UX팀 | 기능 명세를 화면 설계로 번역 |

---

## 폴더 구조

```
product/
  README.md         — 이 파일
  roadmap.md        — 스프린트별 로드맵 및 우선순위
  prd/              — 기능별 PRD (Product Requirements Document)
  metrics.md        — KPI 정의 및 목표치
  personas.md       — 핵심 사용자 페르소나
```

---

## 제품 개요

- 서비스명: Lito
- 도메인: litodate.app
- 타겟: 한국-일본 간 교류에 관심 있는 20-35세
- 핵심 가치: 신뢰 기반 문화 매칭, 실시간 AI 번역, 안티스캠 방어

---

## 스프린트 현황

| 스프린트 | 목표 | 상태 |
|---|---|---|
| Sprint 0 | 런칭 차단 P0 이슈 제거 | COMPLETED |
| Sprint 1 | 읽음 표시 / 애널리틱스 / Push 검증 / 사진 삭제 / auth rate limit / 약관 | PLANNED |
| Sprint 2 | Closed Beta 운영 / KPI 관찰 / AI 코칭 제한 공개 | PLANNED |
| Sprint 3 | ID 인증 / 안티스캠 자동 탐지 / 계정 삭제 / 신고 워크플로우 | PLANNED |

---

## 업데이트 규칙

1. 기능 추가/변경 결정 시 `prd/` 에 PRD를 먼저 작성한 뒤 구현 요청한다.
2. 스프린트 완료 후 roadmap.md 상태를 갱신한다.
3. 제품 방향에 영향을 주는 결정은 `docs/decision_log.md` 에 반영한다.
4. KPI 목표 변경 시 `metrics.md` 를 업데이트하고 변경 사유를 인라인 주석으로 남긴다.

---
---

# [9] docs/policy/README.md

---

# Policy

---

## 폴더 목적

LITO 서비스의 개인정보처리방침, 이용약관, 데이터 보유 정책, 안티스캠 운영 정책, 콘텐츠 신고 기준을 관리한다.
서비스 내 `/api/legal/*` 엔드포인트와 이 폴더의 내용을 동기화한다.

---

## 담당 팀

| 팀 | 역할 |
|---|---|
| 05_정책팀 | 정책 문서 초안 작성, 법률 검토 요청, 업데이트 관리 |
| 00_지휘본부 | 정책 변경 승인, decision_log 반영 여부 판단 |
| 04_기술팀 | 개인정보 관련 기술 결정 반영, /api/legal/* 엔드포인트 동기화 |

---

## 폴더 구조

```
policy/
  README.md                — 이 파일
  privacy_policy.md        — 개인정보처리방침
  terms_of_service.md      — 이용약관
  data_retention.md        — 데이터 보유 및 삭제 정책
  anti_scam.md             — 안티스캠 운영 정책 및 대응 절차
  content_moderation.md    — 콘텐츠 신고/제재 기준
```

---

## 현재 정책 상태

| 문서 | 상태 | 마지막 검토 |
|---|---|---|
| 개인정보처리방침 | 초안 필요 | - |
| 이용약관 | 초안 필요 | - |
| 데이터 보유 정책 | 초안 필요 | - |
| 안티스캠 정책 | 초안 필요 | - |
| 콘텐츠 신고 기준 | 초안 필요 | - |

---

## 기술 정책 결정 사항 (현재)

| 항목 | 결정 | 상태 |
|---|---|---|
| 전화번호 저장 | SHA-256 해시만 보관, 원본 미전송 | CONFIRMED |
| Apple Sign-In | Sprint 1 JWKS 검증 구현 전까지 비활성화 | CONFIRMED |
| SESSION_SECRET | production 미설정 시 부팅 차단 | CONFIRMED |

---

## 업데이트 규칙

1. 정책 변경 시 변경일, 변경 사유, 영향 범위를 문서 상단에 기록한다.
2. 개인정보 관련 기술 결정은 `docs/decision_log.md` 에도 반드시 기록한다.
3. 법적 검토가 필요한 변경은 외부 법률 검토 후 반영한다.
4. 서비스 내 `/api/legal/*` 엔드포인트는 이 폴더의 내용과 항상 동기화 상태를 유지한다.

---
---

# [10] docs/ux/README.md

---

# UX

---

## 폴더 목적

LITO의 UX 리서치 결과, 화면 설계, 사용자 플로우, 디자인 시스템 참조를 관리한다.
구현 전 화면 명세가 여기에 먼저 존재해야 한다.

---

## 담당 팀

| 팀 | 역할 |
|---|---|
| 03_UX팀 | 플로우 설계, 화면 명세, 디자인 시스템 관리, 사용성 테스트 수행 |
| 01_리서치팀 | 사용성 테스트 결과 및 인터뷰 인사이트 제공 |
| 04_기술팀 | 화면 명세를 참조하여 구현, 불일치 발견 시 03_UX팀에 통보 |
| 00_지휘본부 | UX 방향 변경 시 승인 |

---

## 폴더 구조

```
ux/
  README.md           — 이 파일
  flows/              — 주요 사용자 플로우 다이어그램 (Mermaid 또는 링크)
  screens/            — 화면별 UX 명세 및 상태 정의
  design_system.md    — 색상, 타이포그래피, 컴포넌트 규칙
  usability_tests/    — 사용성 테스트 기획 및 결과
```

---

## 핵심 플로우 현황

| 플로우 | 구현 상태 | 문서 상태 |
|---|---|---|
| 온보딩 (언어 선택 → 프로필 설정) | 완료 | 미작성 |
| 탐색 / 스와이프 | 완료 | 미작성 |
| 매칭 후 채팅 | 완료 | 미작성 |
| AI 번역 / 답장 제안 | 완료 | 미작성 |
| 신고 / 차단 | 완료 | 미작성 |
| 설정 / 연락처 차단 | 완료 | 미작성 |

---

## 업데이트 규칙

1. 신규 화면 추가 시 `screens/` 에 명세를 먼저 작성하고 구현 요청한다.
2. 사용성 테스트 완료 후 72시간 이내에 `usability_tests/` 에 결과를 기록한다.
3. 디자인 시스템 변경은 `design_system.md` 를 먼저 업데이트한 뒤 코드에 반영한다.
4. 제품 방향에 영향을 주는 UX 결정은 `docs/decision_log.md` 에 반영한다.

---
---

# [11] docs/ai/README.md

---

# AI

---

## 폴더 목적

LITO의 AI 기능 설계, 프롬프트 버전 관리, 응답 품질 평가 기준, API 비용 추적, PRS 알고리즘 문서를 관리한다.

---

## 담당 팀

| 팀 | 역할 |
|---|---|
| 06_AI팀 | 프롬프트 설계/버전관리, 품질 평가, 비용 추적, PRS 알고리즘 개선 제안 |
| 04_기술팀 | AI 기능 구현, 엔드포인트 관리 |
| 00_지휘본부 | chat.service.ts / prsScoring.ts 변경 승인 (불변 원칙 예외 처리) |

---

## 폴더 구조

```
ai/
  README.md           — 이 파일
  features.md         — AI 기능 목록 및 현재 구현 상태
  prompts/            — 프롬프트 버전 관리 (기능별 파일)
  evaluation/         — AI 응답 품질 평가 기준 및 테스트 결과
  cost_tracking.md    — OpenAI API 비용 추적 및 최적화 기록
  prs/                — PRS(Partner Receptivity Score) 알고리즘 문서
```

---

## 현재 AI 기능 목록

| 기능 | 엔드포인트 | 인증 | 상태 |
|---|---|---|---|
| 답장 제안 | POST /api/ai/suggest-reply | requireAuth | 운영 |
| 번역 | POST /api/ai/translate | requireAuth | 운영 |
| 대화 코칭 | POST /api/ai/coach | requireAuth | 운영 |
| AI 페르소나 | POST /api/ai/persona | requireAuth | 운영 |
| 대화 시작 문장 | POST /api/ai/conversation-starter | requireAuth | 운영 |
| 프로필 사진 생성 | POST /api/ai/generate-profile-photo | requireAuth | 운영 |
| PRS 조회 | GET /api/ai/prs/:id | requireAuth | 운영 |
| PRS 히스토리 | GET /api/ai/prs/:id/history | requireAuth | 운영 |

---

## 불변 원칙

- `chat.service.ts` 와 `prsScoring.ts` 는 직접 수정 금지.
- 변경이 필요하면 이 폴더에 변경 제안서를 먼저 작성하고 00_지휘본부 승인 후 진행.

---

## 업데이트 규칙

1. 프롬프트 변경 시 `prompts/` 에 버전을 기록하고 이전 버전을 보존한다.
2. AI 응답 품질 이슈 발생 시 `evaluation/` 에 케이스, 원인, 조치를 기록한다.
3. OpenAI 비용이 전월 대비 20% 이상 증가하면 `cost_tracking.md` 에 원인 분석을 기입한다.
4. PRS 알고리즘 관련 결정은 `prs/` 에 별도 기록하고 decision_log에 반영한다.

---
---

# [12] docs/tech/README.md

---

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

---
---

# [13] docs/growth/README.md

---

# Growth

---

## 폴더 목적

LITO의 유저 획득, 유지, 수익화 전략과 그로스 실험 기록을 관리한다.
KPI 현황을 추적하고, 실험 결과를 누적하여 데이터 기반 성장 결정을 지원한다.

---

## 담당 팀

| 팀 | 역할 |
|---|---|
| 07_성장팀 | KPI 추적, 그로스 실험 설계/운영, 리텐션/수익화 전략 |
| 01_리서치팀 | 가설 검증 결과를 성장 실험에 연결 |
| 02_제품팀 | KPI 달성을 위한 기능 우선순위 조정 |
| 00_지휘본부 | KPI 목표치 승인, 수익화 모델 변경 승인 |

---

## 폴더 구조

```
growth/
  README.md             — 이 파일
  acquisition.md        — 유저 획득 채널 및 전략
  retention.md          — 유지율 개선 실험 기록
  monetization.md       — 수익화 모델 및 실험
  experiments/          — A/B 테스트 및 그로스 실험 기록
  kpi_dashboard.md      — 핵심 KPI 현황 (주간 업데이트)
```

---

## 핵심 KPI 정의

| KPI | 정의 | 목표 (Closed Beta) | 현재 |
|---|---|---|---|
| D1 Retention | 설치 다음날 재접속 비율 | 40% 이상 | 미측정 |
| D7 Retention | 설치 7일 후 재접속 비율 | 20% 이상 | 미측정 |
| 매칭 전환율 | 스와이프 중 매칭으로 이어지는 비율 | 15% 이상 | 미측정 |
| AI 기능 사용율 | 채팅 중 AI 기능 사용 비율 | 30% 이상 | 미측정 |
| 프리미엄 전환율 | 가입자 중 유료 전환 비율 | 5% 이상 (Sprint 2~) | 미측정 |

---

## 스프린트별 성장 과제

| 스프린트 | 과제 | 상태 |
|---|---|---|
| Sprint 1 | 애널리틱스 provider 연결, Push 실기기 검증 | PLANNED |
| Sprint 2 | KPI 관찰, 코호트 분석, AI 코칭 제한 공개 | PLANNED |
| Sprint 3 | 수익화 모델 A/B 테스트, 리텐션 캠페인 | PLANNED |

---

## 업데이트 규칙

1. 그로스 실험은 `experiments/` 에 가설과 측정 방법을 먼저 기록한 후 시작한다.
2. 실험 종료 후 결과와 다음 액션을 기록하고 `hypothesis_log.md` 와 연결한다.
3. KPI 수치는 `kpi_dashboard.md` 에 주 1회 업데이트한다.
4. 수익화 모델 변경은 반드시 `docs/decision_log.md` 에 기록하고 00_지휘본부 승인을 받는다.
