# Product

제품 전략, 로드맵, PRD, 기능 명세 저장소.

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
| Sprint 0 | 런칭 차단 P0 이슈 제거 | 완료 |
| Sprint 1 | 읽음 표시 / 애널리틱스 / Push 검증 / 사진 삭제 / auth rate limit / 약관 | 예정 |
| Sprint 2 | Closed Beta 운영 / KPI 관찰 / AI 코칭 제한 공개 | 예정 |
| Sprint 3 | ID 인증 / 안티스캠 자동 탐지 / 계정 삭제 / 신고 워크플로우 | 예정 |

---

## 업데이트 규칙

1. 기능 추가/변경 결정 시 해당 PRD를 `prd/` 에 신규 생성하거나 기존 파일을 업데이트한다.
2. 스프린트 완료 후 roadmap.md 상태를 갱신한다.
3. 제품 방향에 영향을 주는 결정은 반드시 `docs/decision_log.md` 에 기록한다.
4. KPI 목표 변경 시 `metrics.md` 를 업데이트하고 변경 사유를 인라인 주석으로 남긴다.
