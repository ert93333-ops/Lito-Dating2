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
MANUS_API_BASE   = "https://api.manus.im/v1"
GITHUB_REPO      = os.getenv("GITHUB_REPO", "ert93333-ops/Lito-Dating2")
LOOP_INTERVAL    = int(os.getenv("LOOP_INTERVAL_SECONDS", "3600"))
CHATGPT_URL      = "https://chatgpt.com/g/g-p-69e26065fc04819191b84e097eab332e-litoproject/project"
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

def gpt_get_instructions(page, context_report: str = "") -> str:
    """
    ChatGPT LITOproject에 현재 상황을 전달하고 다음 개발 지시사항을 받아온다.
    """
    log.info("[STEP 1] GPT에게 개발 지시사항 요청 중...")

    prompt = f"""당신은 Lito 소개팅 앱(Lito-Dating2)의 수석 개발 PM입니다.
GitHub 저장소: {GITHUB_REPO}

{"=== 이전 Manus 테스트 보고서 ===" + chr(10) + context_report if context_report else "첫 번째 실행입니다."}

위 내용을 바탕으로 지금 당장 Codex가 수행해야 할 코딩 작업을 **1가지만** 구체적으로 지시해주세요.

응답 형식 (반드시 이 JSON 형식으로만 답하세요):
{{
  "task_title": "작업 제목 (한 줄)",
  "codex_prompt": "Codex에게 전달할 정확한 코딩 지시사항 (영어로, 구체적인 파일명과 수정 내용 포함)",
  "test_scenario": "Manus가 테스트해야 할 시나리오 설명 (한국어)",
  "priority": "high|medium|low"
}}"""

    try:
        page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_selector("#prompt-textarea", timeout=15000)

        textarea = page.locator("#prompt-textarea")
        textarea.click()
        textarea.fill(prompt)

        # 전송
        page.keyboard.press("Enter")
        log.info("  GPT 메시지 전송 완료. 응답 대기 중...")

        # 응답 완료 대기 (스트리밍 종료 감지)
        page.wait_for_selector("[data-message-author-role='assistant']", timeout=60000)
        page.wait_for_function(
            "() => !document.querySelector('[data-testid=\"stop-button\"]')",
            timeout=120000
        )

        # 마지막 assistant 메시지 추출
        messages = page.query_selector_all("[data-message-author-role='assistant']")
        if not messages:
            raise RuntimeError("GPT 응답을 찾을 수 없습니다.")

        response_text = messages[-1].inner_text()
        log.info(f"  GPT 응답 수신 ({len(response_text)}자)")

        # JSON 파싱
        import re
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            instructions = json.loads(json_match.group())
            log.info(f"  작업: {instructions.get('task_title', 'N/A')}")
            return instructions
        else:
            # JSON이 아닌 경우 텍스트 그대로 반환
            return {"task_title": "GPT 지시사항", "codex_prompt": response_text,
                    "test_scenario": "전반적인 기능 테스트", "priority": "medium"}

    except Exception as e:
        log.error(f"  GPT 요청 실패: {e}")
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
    instructions = gpt_get_instructions(page, prev_report)

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
