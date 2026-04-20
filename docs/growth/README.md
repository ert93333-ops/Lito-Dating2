# Growth

유저 획득, 유지, 수익화 전략 및 실험 기록 저장소.

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

## 핵심 KPI (정의)

| KPI | 정의 | 목표 (Closed Beta) | 현재 |
|---|---|---|---|
| D1 Retention | 설치 다음날 재접속 비율 | 40% 이상 | 미측정 |
| D7 Retention | 설치 7일 후 재접속 비율 | 20% 이상 | 미측정 |
| 매칭 전환율 | 스와이프 중 매칭으로 이어지는 비율 | 15% 이상 | 미측정 |
| AI 기능 사용율 | 채팅 중 AI 기능 사용 비율 | 30% 이상 | 미측정 |
| 프리미엄 전환율 | 가입자 중 유료 전환 비율 | 5% 이상 | 미측정 |

---

## 스프린트별 그로스 과제

| 스프린트 | 과제 |
|---|---|
| Sprint 1 | 애널리틱스 provider 연결, Push 실기기 검증 |
| Sprint 2 | KPI 관찰, 코호트 분석, AI 코칭 제한 공개 |
| Sprint 3 | 수익화 모델 A/B 테스트, 리텐션 캠페인 |

---

## 업데이트 규칙

1. 그로스 실험(A/B 테스트 등)은 `experiments/` 에 실험 시작 시 가설과 측정 방법을 먼저 기록한다.
2. 실험 종료 후 결과와 다음 액션을 해당 파일에 추가하고 `docs/research/templates/hypothesis_log.md` 와 연결한다.
3. KPI 수치는 `kpi_dashboard.md` 에 주 1회 업데이트한다.
4. 수익화 모델 변경은 `docs/decision_log.md` 에 반드시 기록한다.
