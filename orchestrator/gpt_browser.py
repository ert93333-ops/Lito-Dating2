"""
GPT 브라우저 조작 모듈
======================
Playwright를 사용해 ChatGPT LITOproject와 Codex를 브라우저로 자동 조작한다.

주의: ChatGPT에 이미 로그인된 브라우저 세션이 필요합니다.
      최초 1회는 수동으로 로그인 후 쿠키를 저장해야 합니다.
"""

import json
import time
import logging
import re
from pathlib import Path
from typing import Optional

log = logging.getLogger("gpt_browser")

CHATGPT_PROJECT_URL = "https://chatgpt.com/g/g-p-69e26065fc04819191b84e097eab332e-litoproject/project"
CODEX_URL = "https://chatgpt.com/codex"
COOKIES_FILE = Path(__file__).parent / "chatgpt_cookies.json"


class GPTBrowser:
    """ChatGPT LITOproject 브라우저 자동화 클래스"""

    def __init__(self, page):
        self.page = page

    def _wait_for_response_complete(self, timeout_ms: int = 120000):
        """GPT 응답 스트리밍이 완료될 때까지 대기한다."""
        # Stop 버튼이 사라질 때까지 대기 (스트리밍 종료 신호)
        try:
            self.page.wait_for_function(
                """() => {
                    const stopBtn = document.querySelector('[data-testid="stop-button"]');
                    const sendBtn = document.querySelector('[data-testid="send-button"]');
                    return !stopBtn && sendBtn;
                }""",
                timeout=timeout_ms
            )
        except Exception:
            # 타임아웃 시 그냥 진행
            time.sleep(3)

    def _get_last_assistant_message(self) -> str:
        """마지막 assistant 메시지 텍스트를 반환한다."""
        try:
            messages = self.page.query_selector_all("[data-message-author-role='assistant']")
            if messages:
                return messages[-1].inner_text()
        except Exception as e:
            log.warning(f"메시지 추출 실패: {e}")
        return ""

    def send_message(self, message: str, timeout_ms: int = 120000) -> str:
        """
        LITOproject 채팅창에 메시지를 보내고 응답을 반환한다.
        """
        log.info(f"GPT 메시지 전송 중... ({len(message)}자)")

        self.page.goto(CHATGPT_PROJECT_URL, wait_until="domcontentloaded", timeout=30000)
        self.page.wait_for_selector("#prompt-textarea", timeout=15000)

        # 입력창에 메시지 입력
        textarea = self.page.locator("#prompt-textarea")
        textarea.click()
        textarea.fill(message)
        time.sleep(0.5)

        # 전송 버튼 클릭 또는 Enter
        send_btn = self.page.locator("[data-testid='send-button'], #composer-submit-button")
        if send_btn.count() > 0:
            send_btn.first.click()
        else:
            self.page.keyboard.press("Enter")

        log.info("  전송 완료. 응답 대기 중...")

        # 응답 시작 대기
        self.page.wait_for_selector("[data-message-author-role='assistant']", timeout=30000)

        # 응답 완료 대기
        self._wait_for_response_complete(timeout_ms)

        response = self._get_last_assistant_message()
        log.info(f"  GPT 응답 수신 ({len(response)}자)")
        return response

    def get_instructions(self, prev_report: str = "", github_repo: str = "") -> dict:
        """
        GPT에게 다음 개발 지시사항을 요청하고 파싱된 dict를 반환한다.
        """
        prompt = f"""당신은 Lito 소개팅 앱(Lito-Dating2)의 수석 개발 PM입니다.
GitHub 저장소: {github_repo}

{"=== 이전 Manus 테스트 보고서 ===" + chr(10) + prev_report[:3000] if prev_report else "첫 번째 실행입니다. 현재 프로젝트 상태를 파악하고 가장 중요한 작업을 선택해주세요."}

위 내용을 바탕으로 지금 당장 Codex가 수행해야 할 코딩 작업을 **1가지만** 구체적으로 지시해주세요.

반드시 아래 JSON 형식으로만 답하세요 (다른 텍스트 없이):
{{
  "task_title": "작업 제목 (한 줄, 한국어)",
  "codex_prompt": "Codex에게 전달할 정확한 코딩 지시사항 (영어, 구체적인 파일명과 수정 내용 포함, 200자 이내)",
  "test_scenario": "Manus가 테스트해야 할 시나리오 (한국어, 100자 이내)",
  "priority": "high"
}}"""

        response = self.send_message(prompt)

        # JSON 파싱 시도
        json_match = re.search(r'\{[\s\S]*?\}', response)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # 파싱 실패 시 기본값 반환
        log.warning("GPT 응답 JSON 파싱 실패. 기본값 사용.")
        return {
            "task_title": "코드 품질 개선",
            "codex_prompt": "Review the codebase and fix any TypeScript errors or warnings in artifacts/lito/app/ directory.",
            "test_scenario": "TypeScript 빌드 오류 없이 컴파일되는지 확인",
            "priority": "medium"
        }


class CodexBrowser:
    """ChatGPT Codex 브라우저 자동화 클래스"""

    def __init__(self, page):
        self.page = page

    def execute_task(self, codex_prompt: str, github_repo: str,
                     timeout_minutes: int = 10) -> str:
        """
        Codex에 코딩 작업을 지시하고 완료 상태를 반환한다.
        반환값: 'committed' | 'timeout' | 'error'
        """
        log.info(f"Codex 작업 시작: {codex_prompt[:80]}...")

        full_prompt = f"""{codex_prompt}

Repository: {github_repo}
After completing the task, please commit the changes with a clear commit message describing what was changed."""

        try:
            self.page.goto(CODEX_URL, wait_until="domcontentloaded", timeout=30000)
            self.page.wait_for_selector("textarea[placeholder='Ask Codex anything']", timeout=15000)

            textarea = self.page.locator("textarea[placeholder='Ask Codex anything']").first
            textarea.click()
            textarea.fill(full_prompt)
            time.sleep(0.5)

            # 전송
            send_btn = self.page.locator("button[hint='Send']")
            if send_btn.count() > 0:
                send_btn.first.click()
            else:
                self.page.keyboard.press("Enter")

            log.info(f"  Codex 작업 전송. 완료 대기 중 (최대 {timeout_minutes}분)...")

            # Commit 버튼 대기
            try:
                self.page.wait_for_selector(
                    "button[hint='Commit'], button:has-text('Commit')",
                    timeout=timeout_minutes * 60 * 1000
                )
                log.info("  Codex 완료 감지. 커밋 중...")

                commit_btn = self.page.locator("button[hint='Commit'], button:has-text('Commit')").first
                commit_btn.click()
                time.sleep(5)
                log.info("  GitHub 커밋 완료")
                return "committed"

            except Exception:
                log.warning(f"  Codex 작업 시간 초과 ({timeout_minutes}분)")
                return "timeout"

        except Exception as e:
            log.error(f"  Codex 오류: {e}")
            return "error"


def save_cookies(context, filepath: Path = COOKIES_FILE):
    """브라우저 쿠키를 파일로 저장한다."""
    cookies = context.cookies()
    filepath.write_text(json.dumps(cookies, indent=2), encoding="utf-8")
    log.info(f"쿠키 저장: {filepath}")


def load_cookies(context, filepath: Path = COOKIES_FILE):
    """저장된 쿠키를 브라우저에 로드한다."""
    if filepath.exists():
        cookies = json.loads(filepath.read_text(encoding="utf-8"))
        context.add_cookies(cookies)
        log.info(f"쿠키 로드: {filepath} ({len(cookies)}개)")
        return True
    return False
