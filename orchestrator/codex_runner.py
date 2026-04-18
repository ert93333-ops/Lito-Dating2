from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Dict

from utils import get_git_diff_summary, get_git_head_sha, run_command, truncate

LOGGER = logging.getLogger(__name__)


class CodexRunner:
    def __init__(self, config: Dict[str, str], logs_dir: Path, repo_path: Path):
        self.config = config
        self.logs_dir = logs_dir
        self.repo_path = repo_path

    def run(self, prompt_text: str, timeout_seconds: int = 1200) -> Dict[str, str]:
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        before_sha = get_git_head_sha(self.repo_path)

        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as tf:
            tf.write(prompt_text)
            prompt_file = Path(tf.name)

        base_cmd = self.config["CODEX_CMD"].strip()
        if not base_cmd:
            base_cmd = "codex"
        escaped_prompt = prompt_text.replace('"', '\\"')

        version_cmd = f"{base_cmd} --version"
        version_result = run_command(version_cmd, cwd=self.repo_path, timeout=30)
        LOGGER.info("Codex CLI version check rc=%s", version_result.returncode)

        help_cmd = f"{base_cmd} exec --help"
        help_result = run_command(help_cmd, cwd=self.repo_path, timeout=30)
        help_text = f"{help_result.stdout or ''}\n{help_result.stderr or ''}".lower()
        supports_prompt_file = "--prompt-file" in help_text

        if supports_prompt_file:
            cmd = f'{base_cmd} exec --prompt-file "{prompt_file}"'
        else:
            cmd = f'{base_cmd} exec "{escaped_prompt}"'

        result = run_command(cmd, cwd=self.repo_path, timeout=timeout_seconds)
        after_sha = get_git_head_sha(self.repo_path)
        diff_summary = get_git_diff_summary(self.repo_path)
        diff_summary = "\n".join(
            line for line in diff_summary.splitlines() if "orchestrator/logs/" not in line
        )

        stamp = after_sha or "unknown"
        log_path = self.logs_dir / f"codex_{stamp}.log"
        stdout_path = self.logs_dir / f"codex_{stamp}.stdout.log"
        stderr_path = self.logs_dir / f"codex_{stamp}.stderr.log"
        stdout_path.write_text(result.stdout or "", encoding="utf-8")
        stderr_path.write_text(result.stderr or "", encoding="utf-8")

        failure_reason = ""
        if result.returncode != 0:
            if not base_cmd.strip():
                failure_reason = "CODEX_CMD is empty."
            elif "not found" in (result.stderr or "").lower():
                failure_reason = "CODEX_CMD executable not found. Check command/path."
            else:
                failure_reason = "Codex command returned non-zero exit code."

        log_text = (
            f"CMD: {cmd}\n\n"
            f"VERSION_CMD: {version_cmd}\n"
            f"VERSION_RC: {version_result.returncode}\n"
            f"VERSION_OUT: {version_result.stdout}\n"
            f"VERSION_ERR: {version_result.stderr}\n\n"
            f"HELP_CMD: {help_cmd}\n"
            f"HELP_RC: {help_result.returncode}\n"
            f"HELP_OUT: {help_result.stdout}\n"
            f"HELP_ERR: {help_result.stderr}\n\n"
            f"RETURN_CODE: {result.returncode}\n\n"
            f"FAILURE_REASON: {failure_reason}\n\n"
            f"STDOUT_LOG: {stdout_path}\n"
            f"STDERR_LOG: {stderr_path}\n\n"
            f"STDOUT:\n{result.stdout}\n\n"
            f"STDERR:\n{result.stderr}\n"
        )
        log_path.write_text(log_text, encoding="utf-8")

        summary = {
            "ok": result.returncode == 0,
            "return_code": str(result.returncode),
            "before_sha": before_sha,
            "after_sha": after_sha,
            "stdout": truncate(result.stdout, 3000),
            "stderr": truncate(result.stderr, 3000),
            "diff_summary": truncate(diff_summary, 3000),
            "log_path": str(log_path),
            "stdout_log_path": str(stdout_path),
            "stderr_log_path": str(stderr_path),
            "failure_reason": failure_reason,
            "command": cmd,
            "codex_version": truncate((version_result.stdout or version_result.stderr or "").strip(), 300),
            "help_command": help_cmd,
        }
        LOGGER.info("Codex run finished: rc=%s", result.returncode)
        return summary
