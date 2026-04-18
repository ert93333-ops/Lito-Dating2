#!/usr/bin/env python3
"""
LITO 자동화 오케스트레이터
=========================
흐름:
  1. GPT (ChatGPT LITOproject 브라우저) → 개발 지시사항 생성
  2. Codex (chatgpt.com/codex 브라우저) → 코드 수정 + GitHub 커밋
  3. Manus API → 테스트·보고서 태스크 생성
  4. Manus API → 보고서 결과 수신 (폴링)
  5. GPT → 보고서 분석 → 다음 지시사항 생성
  6. 반복 (자는 동안에도 자동 실행)

사용법:
  python3 orchestrator.py                  # 1회 실행
  python3 orchestrator.py --loop           # 무한 루프 (자동화)
  python3 orchestrator.py --loop --interval 3600  # 1시간마다 반복

환경변수 (.env):
  MANUS_API_KEY=your_manus_api_key
  GITHUB_REPO=ert93333-ops/Lito-Dating2
  LOOP_INTERVAL_SECONDS=3600
"""

import os
import sys
import time
import json
import argparse
import subprocess
import logging
from datetime import datetime
from pathlib import Path

# ── 의존성 자동 설치 ──────────────────────────────────────────────────────────
try:
    import requests
    from dotenv import load_dotenv
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("[SETUP] 필요한 패키지를 설치합니다...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q",
                           "requests", "python-dotenv", "playwright"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    import requests
    from dotenv import load_dotenv
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# ── 설정 로드 ─────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent / ".env")

MANUS_API_KEY    = os.getenv("MANUS_API_KEY", "")
OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL     = os.getenv("OPENAI_MODEL", "gpt-5.4")
MANUS_API_BASE   = "https://api.manus.im/v1"
GITHUB_REPO      = os.getenv("GITHUB_REPO", "ert93333-ops/Lito-Dating2")
LOOP_INTERVAL    = int(os.getenv("LOOP_INTERVAL_SECONDS", "3600"))
CODEX_URL        = "https://chatgpt.com/codex"
LOG_DIR          = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# ── 로깅 설정 ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / f"orchestrator_{datetime.now().strftime('%Y%m%d')}.log"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("orchestrator")


# ══════════════════════════════════════════════════════════════════════════════
# STEP 1: GPT에게 개발 지시사항 요청
# ══════════════════════════════════════════════════════════════════════════════

def gpt_get_instructions(context_report: str = "") -> str:
    """
    ChatGPT LITOproject에 현재 상황을 전달하고 다음 개발 지시사항을 받아온다.
    """
    log.info("[STEP 1] GPT에게 개발 지시사항 요청 중...")

    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY가 설정되지 않았습니다.")

    prompt_dir = Path(__file__).parent / "prompts"
    system_prompt = (prompt_dir / "planner_system.txt").read_text(encoding="utf-8")
    user_template = (prompt_dir / "planner_user_template.txt").read_text(encoding="utf-8")
    prompt = (
        user_template
        .replace("{{current_state}}", "PLANNING")
        .replace("{{current_task}}", "null")
        .replace("{{retry_count}}", "0")
        .replace("{{last_error}}", "None")
        .replace("{{last_codex_summary}}", "None")
        .replace("{{last_manus_report}}", context_report or "None")
    )
    prompt += "\n\nReturn valid JSON only."

    try:
        log.info("  planner 요청 시작 (OpenAI API)")
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": OPENAI_MODEL,
            "temperature": 0.2,
            "input": [
                {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
                {"role": "user", "content": [{"type": "input_text", "text": prompt}]},
            ],
        }
        resp = requests.post("https://api.openai.com/v1/responses", headers=headers, json=payload, timeout=90)
        resp.raise_for_status()
        body = resp.json()

        output_text = body.get("output_text", "")
        if not output_text:
            chunks = []
            for item in body.get("output", []) or []:
                for content in item.get("content", []) or []:
                    text = content.get("text")
                    if text:
                        chunks.append(text)
            output_text = "\n".join(chunks) if chunks else json.dumps(body, ensure_ascii=False)

        log.info("  planner 응답 raw preview: %s", output_text[:300].replace("\n", " "))

        # JSON 파싱 (순수 JSON -> 코드블럭 제거 -> 첫{~마지막} fallback)
        import re
        text = output_text.strip()
        try:
            instructions = json.loads(text)
        except json.JSONDecodeError:
            codeblock = re.sub(r"^```json\\s*|^```|```$", "", text, flags=re.IGNORECASE | re.MULTILINE).strip()
            try:
                instructions = json.loads(codeblock)
            except json.JSONDecodeError:
                json_match = re.search(r'\{[\s\S]*\}', codeblock)
                if not json_match:
                    raise
                instructions = json.loads(json_match.group())
        log.info("  planner 파싱 성공: %s", instructions.get("task_title", "N/A"))
        return instructions

    except Exception as e:
        log.error(f"  planner 파싱/호출 실패: {e}")
        raise


# ══════════════════════════════════════════════════════════════════════════════
# STEP 2: Codex에게 코딩 작업 지시
# ══════════════════════════════════════════════════════════════════════════════

def codex_execute_task(page, instructions: dict) -> str:
    """
    ChatGPT Codex에 코딩 작업을 지시하고 완료될 때까지 대기한다.
    """
    log.info(f"[STEP 2] Codex 코딩 작업 시작: {instructions['task_title']}")

    codex_prompt = f"""{instructions['codex_prompt']}

Repository: {GITHUB_REPO}
After completing the task, commit the changes with a descriptive commit message."""

    try:
        page.goto(CODEX_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_selector("textarea[placeholder='Ask Codex anything']", timeout=15000)

        textarea = page.locator("textarea[placeholder='Ask Codex anything']").first
        textarea.click()
        textarea.fill(codex_prompt)

        # 전송
        page.keyboard.press("Enter")
        log.info("  Codex 작업 전송 완료. 완료 대기 중 (최대 10분)...")

        # Codex는 작업 시간이 길 수 있으므로 최대 10분 대기
        # "Commit" 버튼이 나타나거나 완료 상태 감지
        try:
            page.wait_for_selector("button[hint='Commit'], button:has-text('Commit')",
                                   timeout=600000)
            log.info("  Codex 작업 완료 - Commit 버튼 감지")

            # 자동 커밋
            commit_btn = page.locator("button[hint='Commit'], button:has-text('Commit')").first
            commit_btn.click()
            time.sleep(3)
            log.info("  GitHub 커밋 완료")
            return "committed"

        except PlaywrightTimeout:
            log.warning("  Codex 작업 시간 초과 (10분). 현재 상태로 진행합니다.")
            return "timeout"

    except Exception as e:
        log.error(f"  Codex 작업 실패: {e}")
        raise


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3: Manus API로 테스트 태스크 생성
# ══════════════════════════════════════════════════════════════════════════════

def manus_create_task(instructions: dict, codex_status: str) -> str:
    """
    Manus API를 통해 테스트·보고서 작성 태스크를 생성하고 task_id를 반환한다.
    """
    log.info("[STEP 3] Manus 테스트 태스크 생성 중...")

    if not MANUS_API_KEY:
        log.warning("  MANUS_API_KEY가 설정되지 않았습니다. 이 단계를 건너뜁니다.")
        return None

    prompt = f"""GitHub 저장소 ert93333-ops/Lito-Dating2 를 클론하고 다음 작업을 수행하세요.

## 방금 완료된 Codex 작업
- 작업명: {instructions['task_title']}
- Codex 상태: {codex_status}

## 테스트 시나리오
{instructions['test_scenario']}

## 수행할 작업
1. `git pull` 로 최신 코드 받기
2. `pnpm install` 실행
3. TypeScript 빌드 확인 (`pnpm build` 또는 `npx tsc --noEmit`)
4. API 서버 실행 후 health check
5. 위 테스트 시나리오 검증
6. 결과를 마크다운 보고서로 작성 (실행가능여부 O/X, 오류내용, 다음 수정 우선순위 TOP 3 포함)

보고서를 최종 답변으로 출력해주세요."""

    headers = {
        "x-manus-api-key": MANUS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {"prompt": prompt}

    try:
        resp = requests.post(f"{MANUS_API_BASE}/task.create", json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        task_id = data.get("task_id") or data.get("id")
        log.info(f"  Manus 태스크 생성 완료: {task_id}")
        return task_id
    except Exception as e:
        log.error(f"  Manus 태스크 생성 실패: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
# STEP 4: Manus 보고서 결과 수신 (폴링)
# ══════════════════════════════════════════════════════════════════════════════

def manus_wait_for_report(task_id: str, max_wait_minutes: int = 30) -> str:
    """
    Manus 태스크가 완료될 때까지 폴링하고 보고서 텍스트를 반환한다.
    """
    if not task_id:
        return ""

    log.info(f"[STEP 4] Manus 보고서 대기 중 (task_id: {task_id}, 최대 {max_wait_minutes}분)...")

    headers = {"x-manus-api-key": MANUS_API_KEY}
    deadline = time.time() + max_wait_minutes * 60
    poll_interval = 30  # 30초마다 폴링

    while time.time() < deadline:
        try:
            # 태스크 상태 확인
            resp = requests.get(
                f"{MANUS_API_BASE}/task.detail",
                params={"task_id": task_id},
                headers=headers,
                timeout=15
            )
            resp.raise_for_status()
            data = resp.json()
            status = data.get("status", "")

            log.info(f"  Manus 태스크 상태: {status}")

            if status in ("completed", "finished", "done"):
                # 메시지 목록에서 최종 보고서 추출
                msg_resp = requests.get(
                    f"{MANUS_API_BASE}/task.listMessages",
                    params={"task_id": task_id},
                    headers=headers,
                    timeout=15
                )
                msg_resp.raise_for_status()
                messages = msg_resp.json().get("messages", [])

                # 마지막 assistant 메시지가 보고서
                for msg in reversed(messages):
                    if msg.get("role") == "assistant":
                        report = msg.get("content", "")
                        log.info(f"  보고서 수신 완료 ({len(report)}자)")
                        return report

            elif status in ("failed", "error"):
                log.error(f"  Manus 태스크 실패: {data}")
                return f"Manus 태스크 실패: {status}"

        except Exception as e:
            log.warning(f"  폴링 오류 (재시도 예정): {e}")

        time.sleep(poll_interval)

    log.warning(f"  Manus 보고서 대기 시간 초과 ({max_wait_minutes}분)")
    return "보고서 대기 시간 초과"


# ══════════════════════════════════════════════════════════════════════════════
# 보고서 저장
# ══════════════════════════════════════════════════════════════════════════════

def save_report(instructions: dict, report: str, loop_count: int):
    """보고서를 로컬 파일로 저장한다."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = LOG_DIR / f"report_{loop_count:03d}_{timestamp}.md"

    content = f"""# LITO 자동화 루프 보고서 #{loop_count}
생성일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 이번 루프 작업
- **작업명:** {instructions.get('task_title', 'N/A')}
- **우선순위:** {instructions.get('priority', 'N/A')}
- **Codex 지시사항:** {instructions.get('codex_prompt', 'N/A')[:200]}...

## Manus 테스트 보고서
{report}
"""
    report_path.write_text(content, encoding="utf-8")
    log.info(f"  보고서 저장: {report_path}")
    return str(report_path)


# ══════════════════════════════════════════════════════════════════════════════
# 메인 루프
# ══════════════════════════════════════════════════════════════════════════════

def run_one_cycle(page, loop_count: int, prev_report: str = "") -> str:
    """자동화 루프 1회 실행. 다음 루프를 위한 보고서를 반환한다."""
    log.info(f"\n{'='*60}")
    log.info(f"  자동화 루프 #{loop_count} 시작")
    log.info(f"{'='*60}")

    # STEP 1: GPT 지시사항
    instructions = gpt_get_instructions(prev_report)

    # STEP 2: Codex 코딩
    codex_status = codex_execute_task(page, instructions)

    # STEP 3: Manus 테스트 태스크 생성
    task_id = manus_create_task(instructions, codex_status)

    # STEP 4: 보고서 수신
    report = manus_wait_for_report(task_id)

    # 보고서 저장
    report_path = save_report(instructions, report, loop_count)

    log.info(f"\n루프 #{loop_count} 완료. 보고서: {report_path}")
    return report


def main():
    parser = argparse.ArgumentParser(description="LITO 자동화 오케스트레이터")
    parser.add_argument("--loop", action="store_true", help="무한 루프 실행")
    parser.add_argument("--interval", type=int, default=LOOP_INTERVAL,
                        help=f"루프 간격(초), 기본값: {LOOP_INTERVAL}")
    parser.add_argument("--headless", action="store_true", help="헤드리스 모드 (브라우저 숨김)")
    args = parser.parse_args()

    log.info("LITO 자동화 오케스트레이터 시작")
    log.info(f"  GitHub 저장소: {GITHUB_REPO}")
    log.info(f"  루프 모드: {'ON' if args.loop else 'OFF (1회 실행)'}")
    log.info(f"  루프 간격: {args.interval}초")
    log.info(f"  Manus API: {'설정됨' if MANUS_API_KEY else '미설정 (건너뜀)'}")

    loop_count = 1
    prev_report = ""

    with sync_playwright() as pw:
        # 기존 브라우저 세션 재사용 (로그인 상태 유지)
        browser = pw.chromium.launch(
            headless=args.headless,
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        try:
            while True:
                prev_report = run_one_cycle(page, loop_count, prev_report)
                loop_count += 1

                if not args.loop:
                    break

                log.info(f"\n다음 루프까지 {args.interval}초 대기...")
                time.sleep(args.interval)

        except KeyboardInterrupt:
            log.info("\n사용자에 의해 중단되었습니다.")
        except Exception as e:
            log.error(f"\n오류 발생: {e}", exc_info=True)
        finally:
            browser.close()

    log.info("오케스트레이터 종료")


if __name__ == "__main__":
    main()
