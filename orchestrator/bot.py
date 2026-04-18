from __future__ import annotations

import argparse
import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from codex_runner import CodexRunner
from manus_runner import ManusError, ManusRunner
from planner import PlannerError, make_plan
from state_store import StateStore
from telegram_handler import TelegramHandler
from utils import ensure_dirs, get_git_branch, get_git_head_sha, load_config, now_iso, render_template, run_command


def setup_logging(log_dir: Path) -> None:
    ensure_dirs([log_dir])
    log_path = log_dir / f"orchestrator_{datetime.utcnow().strftime('%Y%m%d')}.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.FileHandler(log_path, encoding="utf-8"), logging.StreamHandler()],
    )


class OrchestratorBot:
    def __init__(self, base_dir: Path, config_path: Path, state_path: Path):
        self.base_dir = base_dir
        self.prompts_dir = base_dir / "prompts"
        self.logs_dir = base_dir / "logs"
        self.reports_dir = base_dir / "reports"

        self.config = load_config(config_path)
        self.repo_path = Path(self.config["REPO_PATH"])
        self.state_store = StateStore(state_path)
        self.state = self.state_store.load()

        self.telegram = TelegramHandler(self.config["TELEGRAM_TOKEN"], self.config["TELEGRAM_CHAT_ID"])
        self.codex_runner = CodexRunner(self.config, self.logs_dir, self.repo_path)
        self.manus_runner = ManusRunner(self.config)

        self.loop_interval_seconds = int(self.config["LOOP_INTERVAL_SECONDS"])
        self.logger = logging.getLogger(self.__class__.__name__)
        self.running = False

        ensure_dirs([self.logs_dir, self.reports_dir])

    def validate_branch_safety(self) -> None:
        branch = get_git_branch(self.repo_path)
        if not branch:
            raise RuntimeError("Unable to determine git branch.")
        if branch in {"main", "master"}:
            raise RuntimeError("Direct execution on main/master is forbidden. Switch to a work branch.")

    def save_state(self) -> None:
        self.state_store.save(self.state)

    def set_error(self, message: str) -> None:
        self.state["last_error"] = message
        self.logger.error(message)
        self.save_state()

    def send_status(self) -> None:
        task = self.state.get("current_task") or {}
        message = (
            "[STATUS]\n"
            f"state: {self.state.get('current_state')}\n"
            f"task: {task.get('task_title') if isinstance(task, dict) else task}\n"
            f"retry_count: {self.state.get('retry_count')}\n"
            f"last_safe_commit: {self.state.get('last_safe_commit')}\n"
            f"last_error: {self.state.get('last_error')}\n"
            f"last_report: {self.state.get('last_report_path')}"
        )
        self.telegram.send_message(message)

    def handle_command(self, command: str) -> None:
        normalized = (command or "").strip().lower()
        try:
            if normalized.startswith("/run"):
                self.logger.info("RUN command received: %s", command)
                if self.running and not self.state.get("paused"):
                    self.telegram.send_message("Automation loop is already running.")
                    return
                self.running = True
                self.state["paused"] = False
                self.state["current_state"] = "IDLE"
                self.telegram.send_message("/run received. Automation loop started.")
            elif normalized == "/pause":
                self.state["paused"] = True
                self.state["current_state"] = "PAUSED"
                self.telegram.send_message("Paused.")
            elif normalized == "/resume":
                self.state["paused"] = False
                self.state["current_state"] = "IDLE"
                self.telegram.send_message("Resumed.")
            elif normalized == "/rollback":
                self.rollback(force=True)
            elif normalized == "/status":
                self.send_status()
            elif normalized == "/lastreport":
                report_path = self.state.get("last_report_path")
                if report_path and Path(report_path).exists():
                    text = Path(report_path).read_text(encoding="utf-8")[:3500]
                    self.telegram.send_message(text)
                else:
                    self.telegram.send_message("No report found.")
            elif normalized == "/help":
                self.telegram.send_message(
                    "Commands: /run /status /pause /resume /rollback /lastreport /help"
                )
            self.save_state()
        except Exception as exc:
            self.logger.exception("Failed to handle telegram command '%s': %s", command, exc)
            self.telegram.send_message(f"Command error ({command}): {exc}")

    def rollback(self, force: bool = False) -> None:
        self.state["current_state"] = "ROLLBACK"
        sha = self.state.get("last_safe_commit")
        if not sha:
            msg = "Rollback requested but last_safe_commit is empty."
            self.set_error(msg)
            self.telegram.send_message(msg)
            return

        result = run_command(f"git reset --hard {sha}", cwd=self.repo_path, timeout=120)
        if result.returncode == 0:
            msg = f"Rollback successful to {sha}."
            self.state["retry_count"] = 0
            self.state["current_task"] = None
            self.state["current_state"] = "IDLE"
            self.telegram.send_message(msg)
        else:
            msg = f"Rollback failed: {result.stderr.strip()}"
            self.set_error(msg)
            self.telegram.send_message(msg)
        self.save_state()

    def generate_plan(self) -> Dict[str, Any]:
        self.state["current_state"] = "PLANNING"
        self.save_state()
        plan = make_plan(self.config, self.prompts_dir, self.state)
        self.state["current_task"] = plan
        self.telegram.send_message(
            f"Planner fixed task: {plan['task_title']} ({plan['priority']})\n{plan['thought_summary']}"
        )
        if plan.get("research_request"):
            self.state["last_research_request"] = plan["research_request"]
            self.state["current_state"] = "RESEARCH_REQUESTED"
            req = plan["research_request"]
            self.telegram.send_message(
                "[Research Request]\n"
                f"reason: {req.get('reason')}\n"
                f"message: {req.get('request_message')}"
            )
        self.save_state()
        return plan

    def run_codex(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        self.state["current_state"] = "CODEX_RUNNING"
        self.save_state()

        template = (self.prompts_dir / "codex_task_template.txt").read_text(encoding="utf-8")
        prompt = render_template(template, {"codex_prompt": plan["codex_prompt"], "task_title": plan["task_title"]})
        result = self.codex_runner.run(prompt)
        self.state["current_state"] = "CODEX_REVIEW"
        self.state["last_codex_summary"] = json.dumps(result, ensure_ascii=False, indent=2)
        self.save_state()

        if result["ok"]:
            self.telegram.send_message(f"Codex completed for task: {plan['task_title']}")
        else:
            self.telegram.send_message(
                f"Codex failed for task: {plan['task_title']}\nrc={result['return_code']}\n{result['stderr'][:600]}"
            )
        return result

    def run_manus(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        self.state["current_state"] = "MANUS_RUNNING"
        self.save_state()

        template = (self.prompts_dir / "manus_task_template.txt").read_text(encoding="utf-8")
        prompt = render_template(template, {"manus_prompt": plan["manus_prompt"], "task_title": plan["task_title"]})
        result = self.manus_runner.run_qa(prompt)
        self.state["current_state"] = "QA_REVIEW"
        self.state["last_manus_report"] = result["report_text"]
        self.save_state()
        self.telegram.send_message(f"Manus completed for task: {plan['task_title']}")
        return result

    def is_ui_task(self, plan: Dict[str, Any]) -> bool:
        combined = " ".join([
            plan.get("task_title", ""),
            plan.get("goal", ""),
            " ".join(plan.get("acceptance_criteria", [])),
        ]).lower()
        return any(token in combined for token in ["ui", "screen", "layout", "button", "문구", "화면"])

    def evaluate_qa(self, plan: Dict[str, Any], manus_result: Dict[str, Any]) -> bool:
        report = manus_result.get("report_text", "")
        screenshot_urls = manus_result.get("screenshot_urls") or []
        ui_task = self.is_ui_task(plan)

        has_pass = any(token in report.lower() for token in ["pass", "success", "성공", "ok"])
        has_screenshot = len(screenshot_urls) > 0

        if ui_task and not has_screenshot:
            self.logger.warning("UI task rejected: screenshot missing.")
            return False
        return has_pass and (has_screenshot if ui_task else True)

    def write_report(
        self,
        plan: Optional[Dict[str, Any]],
        codex_result: Optional[Dict[str, Any]],
        manus_result: Optional[Dict[str, Any]],
        success: bool,
        next_action: str,
    ) -> Path:
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        report_path = self.reports_dir / f"report_{ts}.md"
        screenshot_urls = (manus_result or {}).get("screenshot_urls") or []

        lines = [
            f"# Orchestrator Report ({ts})",
            "",
            f"- time: {now_iso()}",
            f"- current_state: {self.state.get('current_state')}",
            f"- task: {(plan or {}).get('task_title')}",
            f"- success: {success}",
            f"- next_action: {next_action}",
            "",
            "## Planner",
            (plan or {}).get("thought_summary", "N/A"),
            "",
            "## Codex Result",
            json.dumps(codex_result or {}, ensure_ascii=False, indent=2),
            "",
            "## Manus Result",
            json.dumps(manus_result or {}, ensure_ascii=False, indent=2),
            "",
            "## Screenshot URLs",
        ]
        if screenshot_urls:
            lines.extend(f"- {u}" for u in screenshot_urls)
        else:
            lines.append("- (none)")
        report_path.write_text("\n".join(lines), encoding="utf-8")
        self.state["last_report_path"] = str(report_path)
        self.save_state()
        return report_path

    def do_one_iteration(self) -> None:
        if self.state.get("paused"):
            self.state["current_state"] = "PAUSED"
            self.save_state()
            return

        plan = self.state.get("current_task")
        if not plan:
            plan = self.generate_plan()
            if self.state.get("current_state") == "RESEARCH_REQUESTED":
                self.write_report(plan, None, None, False, "WAITING_USER_INPUT")
                return

        codex_result = self.run_codex(plan)
        if not codex_result.get("ok"):
            self.state["retry_count"] += 1
            self.state["current_state"] = "RETRY"
            self.state["last_error"] = f"Codex failed rc={codex_result['return_code']}"
            if self.state["retry_count"] >= 3:
                self.telegram.send_message("Codex failed 3 times. Triggering automatic rollback.")
                self.rollback()
            self.write_report(plan, codex_result, None, False, "retry_or_rollback")
            self.save_state()
            return

        manus_result = self.run_manus(plan)
        success = self.evaluate_qa(plan, manus_result)

        if success:
            self.state["current_state"] = "SUCCESS"
            self.state["retry_count"] = 0
            self.state["last_error"] = None
            self.state["current_task"] = None
            self.state["last_safe_commit"] = get_git_head_sha(self.repo_path)
            next_action = "plan_next_task"
            self.telegram.send_message("QA passed. Task marked successful.")
        else:
            self.state["current_state"] = "RETRY"
            self.state["retry_count"] += 1
            self.state["last_error"] = "QA rejected (failed criteria or missing screenshot)."
            next_action = "retry_same_task"
            self.telegram.send_message("QA rejected. Retrying task.")
            if self.state["retry_count"] >= 3:
                self.telegram.send_message("Same issue failed 3 times. Automatic rollback starts.")
                self.rollback()
                next_action = "rollback"

        self.write_report(plan, codex_result, manus_result, success, next_action)
        self.save_state()

    def run_forever(self) -> None:
        self.validate_branch_safety()
        self.telegram.start()
        self.telegram.send_message("Orchestrator bot online. Use /run to start.")
        self.logger.info("Bot started. Waiting commands.")

        while True:
            command = self.telegram.get_command_nowait()
            if command:
                self.handle_command(command)

            if self.running:
                try:
                    self.do_one_iteration()
                except (PlannerError, ManusError) as exc:
                    self.set_error(str(exc))
                    self.telegram.send_message(f"Loop error: {exc}")
                except Exception as exc:
                    self.set_error(f"Unexpected error: {exc}")
                    self.telegram.send_message(f"Unexpected loop error: {exc}")
            time.sleep(self.loop_interval_seconds)


def main() -> None:
    parser = argparse.ArgumentParser(description="Lito-Dating2 Orchestrator v1")
    parser.add_argument("--config", default="config.txt", help="Path to config file")
    parser.add_argument("--state", default="state.json", help="Path to state file")
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parent
    setup_logging(base_dir / "logs")

    bot = OrchestratorBot(base_dir, Path(args.config), Path(args.state))
    bot.run_forever()


if __name__ == "__main__":
    main()
