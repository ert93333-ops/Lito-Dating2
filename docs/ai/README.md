# AI

AI 기능 설계, 프롬프트 관리, 평가 기준, 비용 추적 저장소.

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

| 기능 | 엔드포인트 | 인증 필요 | 상태 |
|---|---|---|---|
| 답장 제안 | POST /api/ai/suggest-reply | 예 (Sprint 0 적용) | 운영 중 |
| 번역 | POST /api/ai/translate | 예 | 운영 중 |
| 대화 코칭 | POST /api/ai/coach | 예 | 운영 중 |
| AI 페르소나 | POST /api/ai/persona | 예 | 운영 중 |
| 대화 시작 문장 | POST /api/ai/conversation-starter | 예 | 운영 중 |
| 프로필 사진 생성 | POST /api/ai/generate-profile-photo | 예 | 운영 중 |
| PRS 조회 | GET /api/ai/prs/:id | 예 | 운영 중 |
| PRS 히스토리 | GET /api/ai/prs/:id/history | 예 | 운영 중 |

---

## 불변 원칙

- `chat.service.ts` 와 `prsScoring.ts` 는 직접 수정 금지.
  알고리즘 변경 시 이 문서에 먼저 기록하고 리뷰 후 진행.

---

## 업데이트 규칙

1. 프롬프트 변경 시 `prompts/` 에 버전을 기록하고 이전 버전을 보존한다.
2. AI 응답 품질 이슈 발생 시 `evaluation/` 에 케이스와 원인, 조치를 기록한다.
3. OpenAI 비용이 전월 대비 20% 이상 증가하면 `cost_tracking.md` 에 원인 분석을 기입한다.
4. PRS 알고리즘 관련 결정은 `prs/` 에 별도 기록한다.
