# LITO 자동화 오케스트레이터

자는 동안에도 자동으로 앱 개발이 진행되는 AI 자동화 파이프라인입니다.

## 전체 흐름

```
GPT (ChatGPT LITOproject)
    ↓  개발 지시사항 생성 (브라우저 자동 조작)
Codex (chatgpt.com/codex)
    ↓  코드 수정 + GitHub 자동 커밋 (브라우저 자동 조작)
Manus API
    ↓  테스트 태스크 생성 → 실행 → 보고서 작성
GPT (ChatGPT LITOproject)
    ↓  보고서 분석 → 다음 지시사항 생성
    🔁 반복 (설정한 간격마다 자동 실행)
```

## 설치

```bash
cd orchestrator
pip install requests python-dotenv playwright
playwright install chromium
```

## 설정

```bash
cp .env.example .env
# .env 파일을 열어 MANUS_API_KEY 입력
```

### Manus API 키 발급 방법
1. https://open.manus.im 접속
2. 로그인 후 API Keys 메뉴에서 발급

## 사용법

### 1회 실행 (테스트용)
```bash
python3 orchestrator.py
```

### 무한 루프 실행 (자동화 - 1시간마다 반복)
```bash
python3 orchestrator.py --loop --interval 3600
```

### 백그라운드 실행 (자는 동안 자동 실행)
```bash
nohup python3 orchestrator.py --loop --interval 3600 --headless > logs/nohup.log 2>&1 &
echo "PID: $!"
```

### 실행 중지
```bash
# PID 확인 후 종료
ps aux | grep orchestrator
kill <PID>
```

## 파일 구조

```
orchestrator/
├── orchestrator.py     # 메인 오케스트레이터 (진입점)
├── gpt_browser.py      # GPT/Codex 브라우저 자동 조작
├── manus_client.py     # Manus API v2 클라이언트
├── .env.example        # 환경변수 템플릿
├── .env                # 실제 환경변수 (git 제외)
├── logs/               # 실행 로그 및 보고서
│   ├── orchestrator_YYYYMMDD.log
│   └── report_001_YYYYMMDD_HHMMSS.md
└── README.md
```

## 주의사항

- ChatGPT에 **반드시 로그인된 상태**여야 합니다 (Manus 내부 브라우저에 이미 로그인됨)
- Codex가 GitHub 저장소에 **접근 권한**이 있어야 합니다
- `--headless` 옵션 없이 실행하면 브라우저 창이 보입니다 (디버깅 용도)
- Manus API 키가 없으면 STEP 3~4를 건너뛰고 GPT ↔ Codex 루프만 실행됩니다

## 로그 확인

```bash
# 실시간 로그 확인
tail -f logs/orchestrator_$(date +%Y%m%d).log

# 최신 보고서 확인
ls -lt logs/report_*.md | head -5
cat logs/report_001_*.md
```
