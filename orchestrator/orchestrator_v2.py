#!/usr/bin/env python3
"""
🤖 오토매틱최찌 V2.6 (Ultimate Self-Repair Edition)
==================================================
LITO 자율 개발 시스템
- GPT-4o (PM) → Codex CLI (개발자) → Manus API (테스터/해결사)
- 자가 복구(Self-Repair): 오류 발생 시 Manus가 자동 수정 후 재시작
- 텔레그램 원격 제어 및 실시간 리포팅
- 기본 루프 간격: 5분 (300초)
"""

import os
import sys
import time
import json
import subprocess
import logging
import traceback
import threading
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
LOOP_INTERVAL    = int(os.getenv("LOOP_INTERVAL_SECONDS", "300")) # 기본 5분
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
        logging.FileHandler(LOG_DIR / f"automatic_choizzi_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("오토매틱최찌")

client = OpenAI(api_key=OPENAI_API_KEY)

# ── 전역 상태 변수 ────────────────────────────────────────────────────────────
total_cost = 0.0
loop_count = 0
is_paused = False
is_running = True
current_task = "대기 중"
last_update_id = 0
start_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# ══════════════════════════════════════════════════════════════════════════════
# 텔레그램 원격 제어 시스템
# ══════════════════════════════════════════════════════════════════════════════

def send_telegram(message: str):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID: return
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    try:
        if len(message) > 4000: message = message[:3900] + "\n...(중략)"
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}, timeout=15)
    except Exception as e: log.error(f"텔레그램 전송 실패: {e}")

def get_telegram_updates():
    global last_update_id
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
    try:
        resp = requests.get(url, params={"offset": last_update_id + 1, "timeout": 5}, timeout=10)
        data = resp.json()
        if data.get("ok"): return data.get("result", [])
    except: pass
    return []

def handle_telegram_commands():
    global last_update_id, is_paused, is_running, LOOP_INTERVAL
    while is_running:
        try:
            updates = get_telegram_updates()
            for update in updates:
                last_update_id = update["update_id"]
                msg = update.get("message", {})
                text = msg.get("text", "").strip().lower()
                chat_id = str(msg.get("chat", {}).get("id", ""))
                if chat_id != TELEGRAM_CHAT_ID: continue
                
                if text in ("/stop", "/정지"):
                    is_paused = True
                    send_telegram("⏸️ *오토매틱최찌 일시정지됨*")
                elif text in ("/start", "/시작"):
                    is_paused = False
                    send_telegram("▶️ *오토매틱최찌 재개됨*")
                elif text in ("/status", "/상태"):
                    status = "⏸️ 일시정지" if is_paused else "▶️ 작동 중"
                    send_telegram(f"📊 *상태:* {status}\n*루프:* #{loop_count}\n*작업:* {current_task}\n*비용:* ${total_cost:.4f}")
                elif text.startswith(("/interval", "/간격")):
                    parts = text.split()
                    if len(parts) == 2 and parts[1].isdigit():
                        LOOP_INTERVAL = int(parts[1])
                        send_telegram(f"⏱️ *간격 변경:* {LOOP_INTERVAL}초")
                elif text in ("/kill", "/종료"):
                    send_telegram("🛑 *종료됨*"); os._exit(0)
        except: pass
        time.sleep(3)

# ══════════════════════════════════════════════════════════════════════════════
# 핵심 자동화 로직
# ══════════════════════════════════════════════════════════════════════════════

def update_cost(usage):
    global total_cost
    if not usage: return 0
    cost = (usage.prompt_tokens * 0.000005) + (usage.completion_tokens * 0.000015)
    total_cost += cost
    return cost

def get_gpt_instructions(prev_report: str = "", error_msg: str = "") -> dict:
    log.info("[STEP 1] GPT-4o PM 분석 중...")
    ctx = f"⚠️ 오류 발생:\n{error_msg}" if error_msg else f"📋 이전 결과:\n{prev_report[:1000]}" if prev_report else "🚀 첫 실행"
    prompt = f"Lito-Dating2 PM으로서 다음 작업을 JSON으로 지시하세요:\n{ctx}\n{{'task_title': '제목', 'codex_instruction': '영어 지시', 'test_scenario': '검증 내용', 'reasoning': '이유'}}"
    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": "JSON only."}, {"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        update_cost(resp.usage)
        return json.loads(resp.choices[0].message.content)
    except: return None

def run_codex_cli(instruction: str):
    log.info(f"[STEP 2] Codex CLI 실행: {instruction}")
    try:
        subprocess.run("git pull origin main", cwd=PROJECT_ROOT, shell=True, capture_output=True)
        cmd = f'codex -i "{instruction}" -y'
        result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True, shell=True, encoding='utf-8', errors='replace')
        if result.returncode != 0:
            result = subprocess.run(f'codex.cmd -i "{instruction}" -y', cwd=PROJECT_ROOT, capture_output=True, text=True, shell=True, encoding='utf-8', errors='replace')
        
        diff = subprocess.run("git diff --stat", cwd=PROJECT_ROOT, shell=True, capture_output=True, text=True).stdout
        if not diff.strip(): return "No changes", ""
        
        subprocess.run("git add .", cwd=PROJECT_ROOT, shell=True)
        subprocess.run(f'git commit -m "Codex: {instruction[:50]}"', cwd=PROJECT_ROOT, shell=True)
        subprocess.run("git push origin main", cwd=PROJECT_ROOT, shell=True)
        return "Success", diff
    except Exception as e: return "Error", str(e)

def manus_api_call(prompt: str) -> str:
    """Manus API v2 호출 (goal 필드 사용)"""
    headers = {"x-manus-api-key": MANUS_API_KEY, "Content-Type": "application/json"}
    try:
        # 테스트 결과 v2/task.create 에서는 'goal' 필드가 필수적임
        resp = requests.post("https://api.manus.im/v2/task.create", json={"goal": prompt}, headers=headers, timeout=20)
        if resp.status_code == 200: return resp.json().get("task_id")
        log.error(f"Manus API Error: {resp.status_code} {resp.text}")
    except: pass
    return None

def wait_for_manus(task_id: str):
    if not task_id: return "생성 실패"
    headers = {"x-manus-api-key": MANUS_API_KEY}
    start = time.time()
    while time.time() - start < 2400:
        try:
            resp = requests.get(f"https://api.manus.im/v2/task.detail?task_id={task_id}", headers=headers, timeout=15)
            status = resp.json().get("status", "").lower()
            if status in ("completed", "finished", "done"):
                msg_resp = requests.get(f"https://api.manus.im/v2/task.listMessages?task_id={task_id}", headers=headers)
                for msg in reversed(msg_resp.json().get("messages", [])):
                    if msg.get("role") == "assistant": return msg.get("content", "")
            elif status in ("failed", "error"): return "테스트 실패"
        except: pass
        time.sleep(30)
    return "시간 초과"

def main():
    global loop_count, current_task, is_paused, is_running
    threading.Thread(target=handle_telegram_commands, daemon=True).start()
    send_telegram("🤖 *오토매틱최찌 V2.6 가동! (5분 간격)*")
    
    prev_report, last_error = "", ""
    
    while is_running:
        if is_paused: current_task = "⏸️ 일시정지"; time.sleep(5); continue
        
        try:
            loop_count += 1
            instr = get_gpt_instructions(prev_report, last_error)
            if not instr: time.sleep(60); continue
            
            current_task = instr['task_title']
            send_telegram(f"📌 *루프 #{loop_count} 시작*\n*작업:* {current_task}")

            status, result = run_codex_cli(instr['codex_instruction'])
            
            if status == "Success":
                send_telegram(f"💻 *코딩 완료*\n```\n{result[:200]}\n```")
                task_id = manus_api_call(f"Lito-Dating2 검증: {instr['test_scenario']}\n변경사항: {result}")
                if task_id:
                    send_telegram(f"🔍 *Manus 검증 시작* (`{task_id}`)")
                    report = wait_for_manus(task_id)
                    prev_report, last_error = report, ""
                else: last_error = "Manus 생성 실패"
            elif status == "Error":
                send_telegram(f"⚠️ *오류 발생! Manus 자가 복구 시작*")
                # 자가 복구: Manus에게 오류 해결 지시
                repair_id = manus_api_call(f"Lito-Dating2 오류 해결 요청:\n저장소: {GITHUB_REPO}\n오류내용: {result}\n코드를 수정하고 GitHub에 푸시하세요.")
                if repair_id:
                    send_telegram(f"🛠️ *Manus 복구 중* (`{repair_id}`)")
                    prev_report = wait_for_manus(repair_id)
                    last_error = ""
                else: last_error = result
            else:
                send_telegram("ℹ️ 변경사항 없음"); prev_report, last_error = "No changes", ""

            send_telegram(f"📊 *루프 #{loop_count} 완료*\n*비용:* ${total_cost:.4f}")
            
        except Exception as e:
            send_telegram(f"🚨 *치명적 오류:* {str(e)[:200]}"); time.sleep(300)
        
        time.sleep(LOOP_INTERVAL)

if __name__ == "__main__": main()
