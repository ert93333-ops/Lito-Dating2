#!/usr/bin/env python3
"""
🤖 오토매틱최찌 V2.5 (Ultimate Edition)
=======================================
LITO 자율 개발 시스템
- GPT-4o (PM) → Codex CLI (개발자) → Manus API (테스터)
- 텔레그램 원격 제어: 시작/정지/상태 확인/루프 간격 조절
- 자가 치유, 윈도우 완벽 호환, 비용 추적
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

# ══════════════════════════════════════════════════════════════════════════════
# 텔레그램 원격 제어 시스템
# ══════════════════════════════════════════════════════════════════════════════

def send_telegram(message: str):
    """텔레그램 메시지 전송"""
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID: return
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    try:
        if len(message) > 4000: message = message[:3900] + "\n...(중략)"
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}, timeout=15)
    except Exception as e: log.error(f"텔레그램 전송 실패: {e}")

def get_telegram_updates():
    """텔레그램에서 새 메시지 가져오기"""
    global last_update_id
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
    try:
        resp = requests.get(url, params={"offset": last_update_id + 1, "timeout": 5}, timeout=10)
        data = resp.json()
        if data.get("ok"):
            return data.get("result", [])
    except: pass
    return []

def handle_telegram_commands():
    """텔레그램 명령어 처리 (백그라운드 스레드)"""
    global last_update_id, is_paused, is_running, LOOP_INTERVAL
    
    while is_running:
        try:
            updates = get_telegram_updates()
            for update in updates:
                last_update_id = update["update_id"]
                msg = update.get("message", {})
                text = msg.get("text", "").strip().lower()
                chat_id = str(msg.get("chat", {}).get("id", ""))
                
                # 보안: 등록된 chat_id만 허용
                if chat_id != TELEGRAM_CHAT_ID: continue
                
                if text == "/stop" or text == "/정지":
                    is_paused = True
                    send_telegram("⏸️ *오토매틱최찌 일시정지됨*\n`/start` 또는 `/시작`으로 재개할 수 있습니다.")
                
                elif text == "/start" or text == "/시작":
                    is_paused = False
                    send_telegram("▶️ *오토매틱최찌 재개됨*\n다음 루프부터 작업을 시작합니다.")
                
                elif text == "/status" or text == "/상태":
                    status = "⏸️ 일시정지" if is_paused else "▶️ 작동 중"
                    send_telegram(
                        f"📊 *오토매틱최찌 상태*\n\n"
                        f"*상태:* {status}\n"
                        f"*현재 루프:* #{loop_count}\n"
                        f"*현재 작업:* {current_task}\n"
                        f"*루프 간격:* {LOOP_INTERVAL}초 ({LOOP_INTERVAL // 60}분)\n"
                        f"*누적 비용:* ${total_cost:.4f}\n"
                        f"*가동 시작:* {start_time_str}"
                    )
                
                elif text.startswith("/interval") or text.startswith("/간격"):
                    parts = text.split()
                    if len(parts) == 2 and parts[1].isdigit():
                        new_interval = int(parts[1])
                        if new_interval < 30:
                            send_telegram("⚠️ 최소 간격은 30초입니다.")
                        else:
                            LOOP_INTERVAL = new_interval
                            send_telegram(f"⏱️ *루프 간격 변경:* {LOOP_INTERVAL}초 ({LOOP_INTERVAL // 60}분)")
                    else:
                        send_telegram("사용법: `/간격 300` (300초 = 5분)")
                
                elif text == "/kill" or text == "/종료":
                    send_telegram("🛑 *오토매틱최찌 완전 종료*\n다시 시작하려면 PC에서 `python orchestrator_v2.py`를 실행하세요.")
                    is_running = False
                    os._exit(0)
                
                elif text == "/help" or text == "/도움":
                    send_telegram(
                        "🤖 *오토매틱최찌 명령어 목록*\n\n"
                        "`/시작` - 루프 재개\n"
                        "`/정지` - 루프 일시정지\n"
                        "`/상태` - 현재 상태 확인\n"
                        "`/간격 초` - 루프 간격 변경 (예: `/간격 300`)\n"
                        "`/종료` - 프로그램 완전 종료\n"
                        "`/도움` - 이 도움말 표시"
                    )
        except: pass
        time.sleep(3)

# ══════════════════════════════════════════════════════════════════════════════
# 핵심 자동화 로직
# ══════════════════════════════════════════════════════════════════════════════

def update_cost(model: str, usage):
    global total_cost
    if not usage: return 0
    p_tokens = usage.prompt_tokens
    c_tokens = usage.completion_tokens
    cost = (p_tokens * 0.000005) + (c_tokens * 0.000015)
    total_cost += cost
    return cost

# ── STEP 1: GPT-4o PM ─────────────────────────────────────────────────────────
def get_gpt_instructions(prev_report: str = "", error_msg: str = "") -> dict:
    log.info("[STEP 1] GPT-4o PM 분석 중...")
    
    if error_msg:
        ctx = f"⚠️ 직전 오류:\n{error_msg}\n이 오류를 해결하는 작업을 지시하세요."
    elif prev_report:
        ctx = f"📋 이전 결과:\n{prev_report[:1500]}"
    else:
        ctx = "🚀 첫 실행입니다. 프로젝트 핵심 기능을 점검하세요."

    prompt = f"""당신은 Lito-Dating2 프로젝트의 자율 개발 PM입니다.
저장소: {GITHUB_REPO}

{ctx}

다음 작업을 JSON으로 지시하세요. JSON만 출력하세요.
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

# ── STEP 2: Codex CLI ──────────────────────────────────────────────────────────
def run_codex_cli(instruction: str):
    log.info(f"[STEP 2] Codex CLI 실행: {instruction}")
    try:
        # 1. 최신 코드 동기화
        subprocess.run("git pull origin main", cwd=PROJECT_ROOT, shell=True, capture_output=True)
        
        # 2. Codex 실행 (윈도우 호환)
        cmd = f'codex -i "{instruction}" -y'
        log.info(f"  명령어: {cmd}")
        result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True, shell=True, encoding='utf-8', errors='replace')
        
        if result.returncode != 0:
            cmd = f'codex.cmd -i "{instruction}" -y'
            result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True, shell=True, encoding='utf-8', errors='replace')
            if result.returncode != 0:
                raise Exception(f"Codex 오류: {result.stderr or result.stdout}")

        # 3. 변경사항 확인
        diff = subprocess.run("git diff --stat", cwd=PROJECT_ROOT, shell=True, capture_output=True, text=True).stdout
        if not diff.strip():
            return "No changes detected", ""

        # 4. GitHub 푸시
        subprocess.run("git add .", cwd=PROJECT_ROOT, shell=True)
        subprocess.run(f'git commit -m "Codex: {instruction[:50]}"', cwd=PROJECT_ROOT, shell=True)
        subprocess.run("git push origin main", cwd=PROJECT_ROOT, shell=True)
        
        return "Success", diff
    except Exception as e:
        return "Error", str(e)

# ── STEP 3: Manus API ─────────────────────────────────────────────────────────
def manus_run_test(instructions: dict, diff_stat: str) -> str:
    log.info("[STEP 3] Manus 검증 요청 중...")
    prompt = f"""GitHub 저장소 {GITHUB_REPO} 의 최신 코드를 검증하세요.

## 작업 배경
Codex 작업: {instructions['codex_instruction']}
변경 통계: {diff_stat}

## 검증 시나리오
{instructions['test_scenario']}

## 필수 수행
1. `git pull`로 최신 코드 확보
2. `pnpm install` 및 빌드 확인
3. 시나리오에 따른 실제 동작 테스트
4. 마크다운 보고서 작성"""

    headers = {"x-manus-api-key": MANUS_API_KEY, "Content-Type": "application/json"}
    try:
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
    start = time.time()
    
    while time.time() - start < 2400:
        if not is_running: return "시스템 종료됨"
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
                return f"Manus 실패: {data.get('error', 'Unknown')}"
        except Exception as e:
            log.warning(f"  폴링 중... ({e})")
        time.sleep(30)
    return "Manus 시간 초과 (40분)"

# ══════════════════════════════════════════════════════════════════════════════
# 메인 루프
# ══════════════════════════════════════════════════════════════════════════════

def main():
    global loop_count, current_task, start_time_str, is_paused, is_running
    
    start_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log.info("🤖 오토매틱최찌 V2.5 가동!")
    
    # 텔레그램 명령어 수신 스레드 시작
    cmd_thread = threading.Thread(target=handle_telegram_commands, daemon=True)
    cmd_thread.start()
    
    send_telegram(
        "🤖 *오토매틱최찌 V2.5 가동!*\n\n"
        "자율 개발 시스템이 시작되었습니다.\n\n"
        "*사용 가능한 명령어:*\n"
        "`/시작` - 루프 재개\n"
        "`/정지` - 루프 일시정지\n"
        "`/상태` - 현재 상태 확인\n"
        "`/간격 초` - 루프 간격 변경\n"
        "`/종료` - 프로그램 종료\n"
        "`/도움` - 도움말"
    )
    
    prev_report = ""
    last_error = ""
    
    while is_running:
        # 일시정지 상태이면 대기
        if is_paused:
            current_task = "⏸️ 일시정지 중"
            time.sleep(5)
            continue
        
        try:
            loop_count += 1
            log.info(f"\n{'='*50}\n[루프 #{loop_count}] 시작\n{'='*50}")
            
            # 1. GPT PM 판단
            current_task = "GPT-4o PM 분석 중"
            instr = get_gpt_instructions(prev_report, last_error)
            if not instr:
                send_telegram("⚠️ GPT 지시 생성 실패. 5분 후 재시도.")
                time.sleep(300); continue
            
            current_task = instr['task_title']
            send_telegram(f"📌 *루프 #{loop_count} 작업 결정*\n*제목:* {instr['task_title']}\n*이유:* {instr['reasoning']}")

            # 2. Codex 코딩
            current_task = f"Codex 코딩: {instr['task_title']}"
            status, result = run_codex_cli(instr['codex_instruction'])
            
            if status == "Success":
                send_telegram(f"💻 *코딩 및 푸시 완료*\n```\n{result}\n```")
                
                # 3. Manus 테스트
                current_task = f"Manus 검증: {instr['task_title']}"
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
                send_telegram("ℹ️ *변경사항 없음*")
                prev_report = "No changes needed."
                last_error = ""
                report = "No changes"
            else:
                send_telegram(f"❌ *Codex 오류:*\n{result}")
                last_error = result
                report = f"Codex Error: {result}"

            # 4. 결과 알림
            summary = report[:800] + "..." if len(report) > 800 else report
            send_telegram(f"📊 *루프 #{loop_count} 완료*\n*비용:* ${total_cost:.4f}\n\n*요약:*\n{summary}")
            
            # 보고서 파일 저장
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            (LOG_DIR / f"report_{loop_count}_{ts}.md").write_text(report, encoding="utf-8")
            
        except Exception as e:
            err_trace = traceback.format_exc()
            log.error(f"치명적 오류: {err_trace}")
            send_telegram(f"🚨 *시스템 오류:*\n```\n{err_trace[:1000]}\n```")
            time.sleep(600)
        
        current_task = f"대기 중 ({LOOP_INTERVAL}초)"
        log.info(f"루프 #{loop_count} 종료. {LOOP_INTERVAL}초 대기...")
        time.sleep(LOOP_INTERVAL)

if __name__ == "__main__":
    main()
