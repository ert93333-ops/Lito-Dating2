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
