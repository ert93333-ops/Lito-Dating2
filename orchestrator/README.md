# Lito-Dating2 Orchestrator v1

## 개요
`orchestrator/bot.py`는 OpenAI Planner + Codex CLI + Manus API + Telegram을 연결해 24시간 자동 개발 루프를 수행하는 Python 오케스트레이터입니다.

핵심 운영 원칙은 코드에 반영되어 있습니다.
- UI 변경은 Manus 스크린샷 URL 없으면 완료 처리 금지
- 한 루프당 단일 소작업만 수행
- 모바일(Android/iOS) 전제
- ko/ja i18n 검증 포함
- 동일 이슈 3회 실패 시 자동 롤백
- 최소 수정 원칙 강제

## 폴더 구조

```text
orchestrator/
  bot.py
  planner.py
  codex_runner.py
  manus_runner.py
  telegram_handler.py
  state_store.py
  utils.py
  config.txt.example
  state.json.example
  prompts/
    planner_system.txt
    planner_user_template.txt
    codex_task_template.txt
    manus_task_template.txt
  logs/
    .gitkeep
  reports/
    .gitkeep
```

## config 설정
1. `config.txt.example`를 복사해 `config.txt` 생성
2. 필수값 입력
3. 로더는 `utf-8` 우선, 실패 시 `cp949` fallback
4. 빈 줄/`#` 주석 허용
5. 필수값 누락 시 시작 단계에서 명확한 예외 발생

필수 항목:
- OPENAI_API_KEY
- OPENAI_MODEL
- MANUS_API_KEY
- MANUS_BASE_URL
- TELEGRAM_TOKEN
- TELEGRAM_CHAT_ID
- GITHUB_REPO
- REPO_PATH
- LOOP_INTERVAL_SECONDS
- CODEX_CMD
- PYTHON_CMD

## 실행 방법

```bash
cd orchestrator
cp config.txt.example config.txt
cp state.json.example state.json
python bot.py --config config.txt --state state.json
```

> 안전 규칙: 현재 git 브랜치가 `main`/`master`면 실행을 중단합니다.

## Telegram 명령어
- `/run`: 자동 루프 시작
- `/status`: 현재 상태 보고
- `/pause`: 일시정지
- `/resume`: 재개
- `/rollback`: 최근 안정 SHA로 강제 롤백
- `/lastreport`: 최근 리포트 출력
- `/help`: 명령어 안내

## 상태 머신
기본 상태:
- IDLE
- PLANNING
- CODEX_RUNNING
- CODEX_REVIEW
- MANUS_RUNNING
- QA_REVIEW
- SUCCESS
- RETRY
- ROLLBACK
- PAUSED
- RESEARCH_REQUESTED

루프 동작:
1. paused면 작업 생략
2. 현재 작업이 없으면 Planner 호출
3. Codex 실행 + 로그/요약 저장
4. Manus QA 실행 + 스크린샷 URL 파싱
5. 성공 시 `last_safe_commit` 갱신
6. 실패 시 retry 증가, 3회 이상이면 자동 롤백

## 롤백 규칙
- 동일 작업 3회 실패 시 자동 롤백
- `/rollback` 수동 실행 지원
- 동작: `git reset --hard <last_safe_commit>`
- 실패 시 에러 상태/텔레그램 알림

## 보고서
각 루프마다 `reports/report_*.md` 생성:
- 시간
- 작업 정보
- planner 요약
- codex 결과
- manus 결과
- screenshot URL
- 성공/실패
- 다음 액션

## 주의사항
- Manus 응답은 JSON 우선 파싱, 실패 시 정규식 fallback으로 screenshot URL 추출
- Codex CLI 실행 명령은 `CODEX_CMD`로 외부화되어 환경별 커스터마이징 가능
- non-TTY 환경에서도 subprocess 기반으로 동작
- v1에서는 research request를 Telegram으로 전달하고 상태 저장까지만 지원
