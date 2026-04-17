#!/usr/bin/env python3
"""
LITO 자동화 오케스트레이터 V2.1 (API + 텔레그램 알림)
==================================================
흐름:
  1. GPT-4o (OpenAI API) → 개발 지시사항 생성
  2. Manus API → 코딩 + 테스트 + 보고서 작성
  3. 텔레그램 → 진행 상황 및 예상 요금 알림
  4. 반복
"""

import os
import sys
import time
import json
import argparse
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

# 요금 계산용 전역 변수
total_cost = 0.0

# ── 텔레그램 알림 함수 ────────────────────────────────────────────────────────
def send_telegram(message: str):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    try:
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}, timeout=10)
    except Exception as e:
        log.error(f"텔레그램 전송 실패: {e}")

# ── 요금 계산 함수 ────────────────────────────────────────────────────────────
def update_cost(model: str, prompt_tokens: int, completion_tokens: int):
    global total_cost
    # GPT-4o 가격 (2024 기준: Input $5/1M, Output $15/1M)
    if "gpt-4o" in model:
        cost = (prompt_tokens * 0.000005) + (completion_tokens * 0.000015)
        total_cost += cost
        return cost
    return 0

# ── STEP 1: GPT-4o 판단 ───────────────────────────────────────────────────────
def get_gpt_instructions(prev_report: str = "") -> dict:
    log.info("[STEP 1] GPT-4o에게 개발 지시사항 요청 중...")
    
    prompt = f"""당신은 Lito 소개팅 앱(Lito-Dating2)의 수석 개발 PM입니다.
GitHub 저장소: {GITHUB_REPO}

{"=== 이전 Manus 테스트 보고서 ===" + chr(10) + prev_report[:2000] if prev_report else "첫 번째 실행입니다. 현재 프로젝트 상태를 파악하고 가장 중요한 작업을 선택해주세요."}

위 내용을 바탕으로 지금 당장 수행해야 할 코딩 작업을 **1가지만** 구체적으로 지시해주세요.

반드시 아래 JSON 형식으로만 답하세요:
{{
  "task_title": "작업 제목 (한 줄, 한국어)",
  "codex_prompt": "수행할 정확한 코딩 지시사항 (영어, 구체적인 파일명과 수정 내용 포함)",
  "test_scenario": "Manus가 테스트해야 할 시나리오 (한국어)",
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
        
        instructions = json.loads(response.choices[0].message.content)
        log.info(f"  작업 결정: {instructions['task_title']}")
        return instructions
    except Exception as e:
        log.error(f"  GPT 요청 실패: {e}")
        return None

# ── STEP 2: Manus API 실행 ────────────────────────────────────────────────────
def manus_run_task(instructions: dict) -> str:
    log.info("[STEP 2] Manus 태스크 생성 중...")
    
    prompt = f"""GitHub 저장소 {GITHUB_REPO} 를 대상으로 다음 작업을 수행하세요.

## 목표 작업
{instructions['codex_prompt']}

## 테스트 시나리오
{instructions['test_scenario']}

## 수행 단계
1. 최신 코드 받기
2. 지시사항에 따라 코드 수정
3. 수정된 코드를 GitHub에 커밋 및 푸시
4. `pnpm install` 및 빌드 확인
5. 테스트 시나리오 검증
6. 결과를 마크다운 보고서로 작성

보고서를 최종 답변으로 출력하세요."""

    headers = {"x-manus-api-key": MANUS_API_KEY, "Content-Type": "application/json"}
    try:
        resp = requests.post("https://api.manus.im/v2/task.create", json={"content": prompt}, headers=headers)
        resp.raise_for_status()
        task_id = resp.json().get("task_id")
        log.info(f"  Manus 태스크 생성 완료: {task_id}")
        return task_id
    except Exception as e:
        log.error(f"  Manus 태스크 생성 실패: {e}")
        return None

# ── STEP 3: Manus 보고서 수신 ──────────────────────────────────────────────────
def wait_for_manus_report(task_id: str) -> str:
    if not task_id: return "태스크 생성 실패"
    log.info(f"[STEP 3] Manus 보고서 대기 중 ({task_id})...")
    
    headers = {"x-manus-api-key": MANUS_API_KEY}
    while True:
        try:
            resp = requests.get(f"https://api.manus.im/v2/task.detail?task_id={task_id}", headers=headers)
            status = resp.json().get("status", "").lower()
            
            if status in ("completed", "finished", "done"):
                msg_resp = requests.get(f"https://api.manus.im/v2/task.listMessages?task_id={task_id}", headers=headers)
                messages = msg_resp.json().get("messages", [])
                for msg in reversed(messages):
                    if msg.get("role") == "assistant":
                        return msg.get("content", "")
            elif status in ("failed", "error"):
                return "Manus 태스크 실패"
        except Exception as e:
            log.warning(f"  폴링 중 오류: {e}")
        
        time.sleep(30)

# ── 메인 루프 ─────────────────────────────────────────────────────────────────
def main():
    log.info("LITO 오케스트레이터 V2.1 시작 (텔레그램 알림 포함)")
    send_telegram("🚀 *LITO 자동화 오케스트레이터 시작*\n자는 동안 앱 개발을 시작합니다.")
    
    loop_count = 1
    prev_report = ""
    
    while True:
        start_time = datetime.now().strftime("%H:%M:%S")
        log.info(f"\n{'='*40}\n루프 #{loop_count} 시작\n{'='*40}")
        
        # 1. GPT 판단
        instructions = get_gpt_instructions(prev_report)
        if not instructions:
            send_telegram(f"❌ *루프 #{loop_count} 실패*\nGPT 지시 생성 중 오류 발생")
            time.sleep(60)
            continue

        send_telegram(f"📝 *루프 #{loop_count} 시작 ({start_time})*\n*작업:* {instructions['task_title']}\n*우선순위:* {instructions['priority']}")

        # 2. Manus 실행
        task_id = manus_run_task(instructions)
        if task_id:
            send_telegram(f"🤖 *Manus 작업 시작*\n태스크 ID: `{task_id}`\n테스트 중입니다...")
            report = wait_for_manus_report(task_id)
        else:
            report = "Manus 태스크 생성 실패"

        # 3. 결과 저장 및 알림
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = LOG_DIR / f"report_{loop_count}_{timestamp}.md"
        report_file.write_text(report, encoding="utf-8")
        
        # 텔레그램 요약 전송
        summary = report[:500] + "..." if len(report) > 500 else report
        send_telegram(f"✅ *루프 #{loop_count} 완료*\n\n*누적 예상 요금:* ${total_cost:.4f}\n\n*테스트 결과 요약:*\n{summary}")
        
        prev_report = report
        log.info(f"루프 #{loop_count} 완료. {LOOP_INTERVAL}초 대기...")
        loop_count += 1
        time.sleep(LOOP_INTERVAL)

if __name__ == "__main__":
    main()
