# Research

리서치 산출물 저장소.
사용자 인터뷰, 경쟁사 분석, 리뷰 마이닝, 가설 검증 결과를 보관한다.

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
