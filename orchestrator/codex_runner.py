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

        base_cmd = self.config["CODEX_CMD"]
        if "{prompt_file}" in base_cmd:
            cmd = base_cmd.replace("{prompt_file}", str(prompt_file))
        else:
            cmd = f"{base_cmd} < {prompt_file}"

        result = run_command(cmd, cwd=self.repo_path, timeout=timeout_seconds)
        after_sha = get_git_head_sha(self.repo_path)
        diff_summary = get_git_diff_summary(self.repo_path)

        log_path = self.logs_dir / f"codex_{after_sha or 'unknown'}.log"
        log_text = (
            f"CMD: {cmd}\n\n"
            f"RETURN_CODE: {result.returncode}\n\n"
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
        }
        LOGGER.info("Codex run finished: rc=%s", result.returncode)
        return summary
