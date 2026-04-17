#!/usr/bin/env python3
"""
LITO 자동화 오케스트레이터 V2.2 (Codex CLI + Manus API + 텔레그램)
==============================================================
흐름:
  1. GPT-4o (PM) → 개발 지시사항 생성
  2. Codex CLI (개발자) → 로컬에서 코드 수정 및 GitHub 커밋
  3. Manus API (테스터) → 빌드/실행 테스트 및 보고서 작성
  4. 텔레그램 → 알림
"""

import os
import sys
import time
import json
import subprocess
import logging
import requests
from datetime import datetime
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

# ── 설정 로드 ─────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent / ".env")

OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY", "")
MANUS_API_KEY    = os.getenv("MANUS_API_KEY", "")
GITHUB_REPO      = os.getenv("GITHUB_REPO", "ert93333-ops/Lito-Dating2")
LOOP_INTERVAL    = int(os.getenv("LOOP_INTERVAL_SECONDS", "3600"))
TELEGRAM_TOKEN   = os.getenv("TELEGRAM_TOKEN", "7556881743:AAFgeM78MtD_NWbbji3sSYD0ZFu-cBTGAVw")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "5823637970")
LOG_DIR          = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# ── 로깅 설정 ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / f"orchestrator_v2_{datetime.now().strftime('%Y%m%d')}.log"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("orchestrator_v2")

client = OpenAI(api_key=OPENAI_API_KEY)
total_cost = 0.0

# ── 유틸리티 함수 ────────────────────────────────────────────────────────────
def send_telegram(message: str):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID: return
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    try: requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}, timeout=10)
    except Exception as e: log.error(f"텔레그램 전송 실패: {e}")

def update_cost(model: str, prompt_tokens: int, completion_tokens: int):
    global total_cost
    if "gpt-4o" in model:
        cost = (prompt_tokens * 0.000005) + (completion_tokens * 0.000015)
        total_cost += cost
        return cost
    return 0

# ── STEP 1: GPT-4o 판단 (PM) ──────────────────────────────────────────────────
def get_gpt_instructions(prev_report: str = "") -> dict:
    log.info("[STEP 1] GPT-4o PM에게 작업 지시 요청 중...")
    prompt = f"""당신은 Lito-Dating2 프로젝트의 수석 PM입니다.
저장소: {GITHUB_REPO}

{"=== 이전 테스트 보고서 ===" + chr(10) + prev_report[:2000] if prev_report else "첫 실행입니다. 프로젝트 구조를 파악하고 첫 작업을 지시하세요."}

Codex CLI가 수행할 코딩 작업 1개를 JSON으로 지시하세요:
{{
  "task_title": "작업 제목",
  "codex_instruction": "Codex CLI에게 줄 구체적 코딩 지시 (영어)",
  "test_scenario": "Manus가 검증할 내용 (한국어)",
  "priority": "high"
}}"""
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        usage = response.usage
        update_cost("gpt-4o", usage.prompt_tokens, usage.completion_tokens)
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        log.error(f"GPT 요청 실패: {e}")
        return None

# ── STEP 2: Codex CLI 실행 (개발자) ───────────────────────────────────────────
def run_codex_cli(instruction: str):
    log.info(f"[STEP 2] Codex CLI 실행 중: {instruction}")
    try:
        # 로컬 PC에 codex가 설치되어 있어야 함 (npm install -g @openai/codex)
        # 프로젝트 루트로 이동하여 실행
        project_root = Path(__file__).parent.parent
        cmd = ["codex", "-i", instruction, "-y"]
        result = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True, check=True)
        log.info("  Codex CLI 작업 완료")
        
        # 변경사항 GitHub 푸시
        subprocess.run(["git", "add", "."], cwd=project_root)
        subprocess.run(["git", "commit", "-m", f"Codex: {instruction[:50]}"], cwd=project_root)
        subprocess.run(["git", "push", "origin", "main"], cwd=project_root)
        log.info("  GitHub 푸시 완료")
        return True
    except Exception as e:
        log.error(f"  Codex CLI 또는 Git 작업 실패: {e}")
        return False

# ── STEP 3: Manus API 실행 (테스터) ───────────────────────────────────────────
def manus_run_test(instructions: dict) -> str:
    log.info("[STEP 3] Manus 테스트 태스크 생성 중...")
    prompt = f"""GitHub 저장소 {GITHUB_REPO} 의 최신 코드를 테스트하세요.

## 작업 배경
Codex가 다음 작업을 수행했습니다: {instructions['codex_instruction']}

## 테스트 시나리오
{instructions['test_scenario']}

## 수행 단계
1. 최신 코드 받기 (`git pull`)
2. `pnpm install` 및 빌드 확인
3. 테스트 시나리오에 따라 실제 실행 가능 여부 검증
4. 결과를 마크다운 보고서로 작성하여 최종 답변으로 제출"""

    headers = {"x-manus-api-key": MANUS_API_KEY, "Content-Type": "application/json"}
    try:
        # Manus API v2 사양에 맞춰 'content' 필드 사용
        resp = requests.post("https://api.manus.im/v2/task.create", json={"content": prompt}, headers=headers)
        if resp.status_code != 200:
            log.error(f"  Manus API 오류: {resp.status_code} - {resp.text}")
            return None
        task_id = resp.json().get("task_id")
        log.info(f"  Manus 태스크 생성 완료: {task_id}")
        return task_id
    except Exception as e:
        log.error(f"  Manus 요청 실패: {e}")
        return None

# ── STEP 4: Manus 보고서 대기 ──────────────────────────────────────────────────
def wait_for_report(task_id: str) -> str:
    if not task_id: return "테스트 생성 실패"
    log.info(f"[STEP 4] Manus 보고서 대기 중 ({task_id})...")
    headers = {"x-manus-api-key": MANUS_API_KEY}
    while True:
        try:
            resp = requests.get(f"https://api.manus.im/v2/task.detail?task_id={task_id}", headers=headers)
            status = resp.json().get("status", "").lower()
            if status in ("completed", "finished", "done"):
                msg_resp = requests.get(f"https://api.manus.im/v2/task.listMessages?task_id={task_id}", headers=headers)
                messages = msg_resp.json().get("messages", [])
                for msg in reversed(messages):
                    if msg.get("role") == "assistant": return msg.get("content", "")
            elif status in ("failed", "error"): return "Manus 테스트 실패"
        except Exception as e: log.warning(f"  폴링 중 오류: {e}")
        time.sleep(30)

# ── 메인 루프 ─────────────────────────────────────────────────────────────────
def main():
    log.info("LITO 오케스트레이터 V2.2 시작 (Codex CLI 연동)")
    send_telegram("🚀 *LITO 자동화 V2.2 시작*\nCodex CLI + Manus API 연동 모드")
    
    loop_count = 1
    prev_report = ""
    
    while True:
        log.info(f"\n{'='*40}\n루프 #{loop_count} 시작\n{'='*40}")
        
        # 1. GPT PM 판단
        instructions = get_gpt_instructions(prev_report)
        if not instructions:
            time.sleep(60); continue
        
        send_telegram(f"📝 *루프 #{loop_count} 시작*\n*작업:* {instructions['task_title']}")

        # 2. Codex CLI 코딩
        if run_codex_cli(instructions['codex_instruction']):
            send_telegram("💻 *Codex CLI 코딩 및 푸시 완료*")
            
            # 3. Manus 테스트
            task_id = manus_run_test(instructions)
            if task_id:
                send_telegram(f"🤖 *Manus 테스트 시작* (ID: `{task_id}`)")
                report = wait_for_report(task_id)
            else:
                report = "Manus 테스트 생성 실패"
        else:
            send_telegram("❌ *Codex CLI 작업 실패*")
            report = "Codex CLI 실패"

        # 4. 결과 알림
        summary = report[:500] + "..." if len(report) > 500 else report
        send_telegram(f"✅ *루프 #{loop_count} 완료*\n*누적 요금:* ${total_cost:.4f}\n\n*결과 요약:*\n{summary}")
        
        prev_report = report
        loop_count += 1
        time.sleep(LOOP_INTERVAL)

if __name__ == "__main__":
    main()
