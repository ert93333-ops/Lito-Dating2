#!/usr/bin/env python3
"""
LITO 자율 개발 오케스트레이터 V2.4 (Ultimate Edition)
======================================================
- 자가 치유(Self-Healing) 및 예외 처리 강화
- 윈도우 환경 완벽 호환 (인코딩, 쉘 실행)
- 텔레그램 상세 리포팅 및 비용 추적
- Git 충돌 방지 및 자동 동기화
- Manus API v2 최신 사양 반영
"""

import os
import sys
import time
import json
import subprocess
import logging
import traceback
import requests
from datetime import datetime
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

# ── 설정 및 환경변수 ──────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent / ".env")

OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY", "")
MANUS_API_KEY    = os.getenv("MANUS_API_KEY", "")
GITHUB_REPO      = os.getenv("GITHUB_REPO", "ert93333-ops/Lito-Dating2")
LOOP_INTERVAL    = int(os.getenv("LOOP_INTERVAL_SECONDS", "3600"))
TELEGRAM_TOKEN   = os.getenv("TELEGRAM_TOKEN", "7556881743:AAFgeM78MtD_NWbbji3sSYD0ZFu-cBTGAVw")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "5823637970")
PROJECT_ROOT     = Path(__file__).parent.parent
LOG_DIR          = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# ── 로깅 설정 ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / f"orchestrator_v2_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("orchestrator_v2")

client = OpenAI(api_key=OPENAI_API_KEY)
total_cost = 0.0

# ── 유틸리티: 텔레그램 알림 ───────────────────────────────────────────────────
def send_telegram(message: str):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID: return
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    try:
        if len(message) > 4000: message = message[:3900] + "\n...(중략)"
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}, timeout=15)
    except Exception as e: log.error(f"텔레그램 전송 실패: {e}")

# ── 유틸리티: 요금 계산 ───────────────────────────────────────────────────────
def update_cost(model: str, usage):
    global total_cost
    if not usage: return 0
    p_tokens = usage.prompt_tokens
    c_tokens = usage.completion_tokens
    # GPT-4o 가격 기준
    cost = (p_tokens * 0.000005) + (c_tokens * 0.000015)
    total_cost += cost
    return cost

# ── STEP 1: GPT-4o PM (판단 및 자가 치유) ─────────────────────────────────────
def get_gpt_instructions(prev_report: str = "", error_msg: str = "") -> dict:
    log.info("[STEP 1] GPT-4o PM 분석 중...")
    
    status_context = ""
    if error_msg:
        status_context = f"⚠️ 직전 작업에서 오류가 발생했습니다:\n{error_msg}\n이 오류를 해결하기 위한 작업을 우선적으로 지시해주세요."
    elif prev_report:
        status_context = f"📋 이전 테스트 결과 요약:\n{prev_report[:1500]}"
    else:
        status_context = "🚀 첫 번째 실행입니다. 프로젝트의 핵심 기능을 먼저 구현하거나 점검하세요."

    prompt = f"""당신은 Lito-Dating2 프로젝트의 자율 개발 PM입니다.
저장소: {GITHUB_REPO}

{status_context}

다음 작업을 JSON으로 지시하세요. 불필요한 설명 없이 JSON만 출력하세요.
{{
  "task_title": "작업 제목 (한국어)",
  "codex_instruction": "Codex CLI에게 줄 구체적 코딩 지시 (영어, 파일명 포함)",
  "test_scenario": "Manus가 검증할 내용 (한국어)",
  "reasoning": "이 작업을 선택한 이유 (한국어)"
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": "You are a precise PM bot. Output JSON only."},
                      {"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        update_cost("gpt-4o", response.usage)
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        log.error(f"GPT 요청 실패: {e}")
        return None

# ── STEP 2: Codex CLI (실제 코딩 및 Git 관리) ──────────────────────────────────
def run_codex_cli(instruction: str):
    log.info(f"[STEP 2] Codex CLI 실행: {instruction}")
    try:
        # 1. 최신 코드 동기화
        subprocess.run("git pull origin main", cwd=PROJECT_ROOT, shell=True, capture_output=True)
        
        # 2. Codex 실행 (윈도우 호환성 강화)
        cmd = f'codex -i "{instruction}" -y'
        log.info(f"  명령어 실행: {cmd}")
        result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True, shell=True, encoding='utf-8', errors='replace')
        
        if result.returncode != 0:
            # codex 명령어를 못 찾을 경우 codex.cmd 시도
            cmd = f'codex.cmd -i "{instruction}" -y'
            result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True, shell=True, encoding='utf-8', errors='replace')
            if result.returncode != 0:
                raise Exception(f"Codex 실행 오류: {result.stderr or result.stdout}")

        # 3. 변경사항 확인
        diff = subprocess.run("git diff --stat", cwd=PROJECT_ROOT, shell=True, capture_output=True, text=True).stdout
        if not diff.strip():
            log.info("  변경사항 없음")
            return "No changes detected", ""

        # 4. GitHub 푸시
        subprocess.run("git add .", cwd=PROJECT_ROOT, shell=True)
        commit_msg = f"Codex: {instruction[:50]}"
        subprocess.run(f'git commit -m "{commit_msg}"', cwd=PROJECT_ROOT, shell=True)
        subprocess.run("git push origin main", cwd=PROJECT_ROOT, shell=True)
        
        log.info(f"  코딩 및 푸시 완료:\n{diff}")
        return "Success", diff
    except Exception as e:
        err = str(e)
        log.error(f"  Codex/Git 작업 실패: {err}")
        return "Error", err

# ── STEP 3: Manus API (검증 및 보고서) ────────────────────────────────────────
def manus_run_test(instructions: dict, diff_stat: str) -> str:
    log.info("[STEP 3] Manus 검증 요청 중...")
    prompt = f"""GitHub 저장소 {GITHUB_REPO} 의 최신 코드를 검증하세요.

## 작업 배경
Codex가 다음 작업을 수행했습니다: {instructions['codex_instruction']}
변경된 파일 통계:
{diff_stat}

## 검증 시나리오
{instructions['test_scenario']}

## 필수 수행 단계
1. `git pull`로 최신 코드 확보
2. `pnpm install` 및 빌드 성공 여부 확인
3. 시나리오에 따른 실제 동작 테스트 (API 서버 및 Expo 앱 실행)
4. 발견된 문제점이나 개선 제안을 포함한 마크다운 보고서 작성

보고서를 최종 답변으로 제출하세요."""

    headers = {"x-manus-api-key": MANUS_API_KEY, "Content-Type": "application/json"}
    try:
        # Manus API v2 최신 사양: 'content' 필드 사용
        resp = requests.post("https://api.manus.im/v2/task.create", json={"content": prompt}, headers=headers, timeout=20)
        if resp.status_code != 200:
            log.error(f"  Manus API 오류: {resp.status_code} - {resp.text}")
            return None
        return resp.json().get("task_id")
    except Exception as e:
        log.error(f"  Manus 요청 실패: {e}")
        return None

# ── STEP 4: Manus 결과 폴링 ───────────────────────────────────────────────────
def wait_for_report(task_id: str):
    if not task_id: return "Manus 태스크 생성 실패"
    headers = {"x-manus-api-key": MANUS_API_KEY}
    start_time = time.time()
    
    while time.time() - start_time < 2400: # 최대 40분 대기
        try:
            resp = requests.get(f"https://api.manus.im/v2/task.detail?task_id={task_id}", headers=headers, timeout=15)
            data = resp.json()
            status = data.get("status", "").lower()
            
            if status in ("completed", "finished", "done"):
                msg_resp = requests.get(f"https://api.manus.im/v2/task.listMessages?task_id={task_id}", headers=headers)
                messages = msg_resp.json().get("messages", [])
                for msg in reversed(messages):
                    if msg.get("role") == "assistant": return msg.get("content", "")
            elif status in ("failed", "error"):
                return f"Manus 테스트 실패: {data.get('error', 'Unknown error')}"
        except Exception as e:
            log.warning(f"  폴링 중... ({e})")
        time.sleep(30)
    return "Manus 테스트 시간 초과"

# ── 메인 루프 ─────────────────────────────────────────────────────────────────
def main():
    log.info("LITO 자율 개발 오케스트레이터 V2.4 시작")
    send_telegram("🤖 *LITO 자율 개발 시스템 V2.4 가동*\n\n모든 시스템 정상. 자는 동안 개발을 시작합니다.")
    
    loop_count = 1
    prev_report = ""
    last_error = ""
    
    while True:
        try:
            log.info(f"\n{'='*50}\n[루프 #{loop_count}] 시작\n{'='*50}")
            
            # 1. GPT PM 판단
            instr = get_gpt_instructions(prev_report, last_error)
            if not instr:
                send_telegram("⚠️ GPT 지시 생성 실패. 5분 후 재시도합니다."); time.sleep(300); continue
            
            send_telegram(f"📌 *루프 #{loop_count} 작업 결정*\n*제목:* {instr['task_title']}\n*이유:* {instr['reasoning']}")

            # 2. Codex 코딩
            status, result = run_codex_cli(instr['codex_instruction'])
            
            if status == "Success":
                send_telegram(f"💻 *코딩 및 푸시 완료*\n```\n{result}\n```")
                # 3. Manus 테스트
                task_id = manus_run_test(instr, result)
                if task_id:
                    send_telegram(f"🔍 *Manus 검증 시작* (ID: `{task_id}`)")
                    report = wait_for_report(task_id)
                    prev_report = report
                    last_error = ""
                else:
                    report = "Manus 태스크 생성 실패"
                    last_error = report
            elif status == "No changes detected":
                send_telegram("ℹ️ *변경사항 없음:* Codex가 수정할 필요가 없다고 판단했습니다.")
                prev_report = "No changes needed."
                last_error = ""
            else:
                send_telegram(f"❌ *Codex 오류 발생:*\n{result}")
                last_error = result
                report = f"Error in Codex: {result}"

            # 4. 결과 요약 알림
            summary = report[:800] + "..." if len(report) > 800 else report
            send_telegram(f"📊 *루프 #{loop_count} 결과 리포트*\n\n*누적 비용:* ${total_cost:.4f}\n\n*요약:*\n{summary}")
            
        except Exception as e:
            err_trace = traceback.format_exc()
            log.error(f"치명적 루프 오류: {err_trace}")
            send_telegram(f"🚨 *치명적 시스템 오류 발생:*\n```\n{err_trace[:1000]}\n```")
            time.sleep(600)
        
        log.info(f"루프 #{loop_count} 종료. {LOOP_INTERVAL}초 대기...")
        loop_count += 1
        time.sleep(LOOP_INTERVAL)

if __name__ == "__main__":
    main()
