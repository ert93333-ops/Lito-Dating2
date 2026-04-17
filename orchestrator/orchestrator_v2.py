#!/usr/bin/env python3
"""
LITO 자동화 오케스트레이터 V2 (API 기반)
======================================
흐름:
  1. GPT-4o (OpenAI API) → 개발 지시사항 생성
  2. Codex (OpenAI API) → 코드 수정 + GitHub 커밋
  3. Manus API → 테스트·보고서 태스크 생성
  4. Manus API → 보고서 결과 수신 (폴링)
  5. GPT-4o → 보고서 분석 → 다음 지시사항 생성
  6. 반복 (완전 자동화)
"""

import os
import sys
import time
import json
import argparse
import subprocess
import logging
import re
from datetime import datetime
from pathlib import Path

# ── 의존성 설치 ──────────────────────────────────────────────────────────────
try:
    import requests
    from dotenv import load_dotenv
    from openai import OpenAI
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "requests", "python-dotenv", "openai"])
    import requests
    from dotenv import load_dotenv
    from openai import OpenAI

# ── 설정 로드 ─────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent / ".env")

OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY", "")
MANUS_API_KEY    = os.getenv("MANUS_API_KEY", "")
GITHUB_REPO      = os.getenv("GITHUB_REPO", "ert93333-ops/Lito-Dating2")
LOOP_INTERVAL    = int(os.getenv("LOOP_INTERVAL_SECONDS", "60"))
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

# ── STEP 1: GPT-4o 판단 ───────────────────────────────────────────────────────
def get_gpt_instructions(prev_report: str = "") -> dict:
    log.info("[STEP 1] GPT-4o에게 개발 지시사항 요청 중...")
    
    prompt = f"""당신은 Lito 소개팅 앱(Lito-Dating2)의 수석 개발 PM입니다.
GitHub 저장소: {GITHUB_REPO}

{"=== 이전 Manus 테스트 보고서 ===" + chr(10) + prev_report[:3000] if prev_report else "첫 번째 실행입니다. 현재 프로젝트 상태를 파악하고 가장 중요한 작업을 선택해주세요."}

위 내용을 바탕으로 지금 당장 Codex가 수행해야 할 코딩 작업을 **1가지만** 구체적으로 지시해주세요.

반드시 아래 JSON 형식으로만 답하세요:
{{
  "task_title": "작업 제목 (한 줄, 한국어)",
  "codex_prompt": "Codex에게 전달할 정확한 코딩 지시사항 (영어, 구체적인 파일명과 수정 내용 포함)",
  "test_scenario": "Manus가 테스트해야 할 시나리오 (한국어)",
  "priority": "high"
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        instructions = json.loads(response.choices[0].message.content)
        log.info(f"  작업 결정: {instructions['task_title']}")
        return instructions
    except Exception as e:
        log.error(f"  GPT 요청 실패: {e}")
        return {"task_title": "코드 개선", "codex_prompt": "Improve code quality in artifacts/lito/", "test_scenario": "Build test", "priority": "medium"}

# ── STEP 2: Codex 코딩 (GPT-4o로 대체) ────────────────────────────────────────
def execute_codex_task(instructions: dict) -> str:
    log.info(f"[STEP 2] Codex(GPT-4o) 코딩 작업 시작: {instructions['task_title']}")
    
    # 실제 환경에서는 여기서 GitHub API를 사용하여 파일을 수정하거나, 
    # Manus에게 코딩 작업을 시킬 수도 있습니다. 
    # 여기서는 Manus에게 코딩+테스트를 한 번에 시키는 방식으로 최적화합니다.
    return "delegated_to_manus"

# ── STEP 3: Manus API 실행 ────────────────────────────────────────────────────
def manus_run_task(instructions: dict) -> str:
    log.info("[STEP 3] Manus 태스크 생성 중...")
    
    if not MANUS_API_KEY:
        return "MANUS_API_KEY 미설정"

    prompt = f"""GitHub 저장소 {GITHUB_REPO} 를 대상으로 다음 작업을 수행하세요.

## 목표 작업
{instructions['codex_prompt']}

## 테스트 시나리오
{instructions['test_scenario']}

## 수행 단계
1. 최신 코드 받기
2. 지시사항에 따라 코드 수정 (Codex 역할 수행)
3. 수정된 코드를 GitHub에 커밋 및 푸시
4. `pnpm install` 및 빌드 확인
5. 테스트 시나리오 검증
6. 결과를 마크다운 보고서로 작성

보고서를 최종 답변으로 출력하세요."""

    headers = {"x-manus-api-key": MANUS_API_KEY, "Content-Type": "application/json"}
    try:
        # Manus API v2에서는 'prompt' 대신 'content' 필드를 사용합니다.
        resp = requests.post("https://api.manus.im/v2/task.create", json={"content": prompt}, headers=headers)
        resp.raise_for_status()
        task_id = resp.json().get("task_id")
        log.info(f"  Manus 태스크 생성 완료: {task_id}")
        return task_id
    except Exception as e:
        log.error(f"  Manus 태스크 생성 실패: {e}")
        return None

# ── STEP 4: Manus 보고서 수신 ──────────────────────────────────────────────────
def wait_for_manus_report(task_id: str) -> str:
    if not task_id: return "태스크 생성 실패"
    log.info(f"[STEP 4] Manus 보고서 대기 중 ({task_id})...")
    
    headers = {"x-manus-api-key": MANUS_API_KEY}
    while True:
        try:
            resp = requests.get(f"https://api.manus.im/v2/task.detail?task_id={task_id}", headers=headers)
            status = resp.json().get("status", "").lower()
            log.info(f"  상태: {status}")
            
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
    log.info("LITO 오케스트레이터 V2 시작 (API 기반)")
    loop_count = 1
    prev_report = ""
    
    while True:
        log.info(f"\n{'='*40}\n루프 #{loop_count} 시작\n{'='*40}")
        
        instructions = get_gpt_instructions(prev_report)
        task_id = manus_run_task(instructions)
        report = wait_for_manus_report(task_id)
        
        # 보고서 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        Path(LOG_DIR / f"report_{loop_count}_{timestamp}.md").write_text(report, encoding="utf-8")
        
        prev_report = report
        log.info(f"루프 #{loop_count} 완료. {LOOP_INTERVAL}초 대기...")
        loop_count += 1
        time.sleep(LOOP_INTERVAL)

if __name__ == "__main__":
    main()
