import json
import logging
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional

LOGGER = logging.getLogger(__name__)

REQUIRED_CONFIG_KEYS = [
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "MANUS_API_KEY",
    "MANUS_BASE_URL",
    "TELEGRAM_TOKEN",
    "TELEGRAM_CHAT_ID",
    "GITHUB_REPO",
    "REPO_PATH",
    "LOOP_INTERVAL_SECONDS",
    "CODEX_CMD",
    "PYTHON_CMD",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_text_with_fallback(path: Path) -> str:
    for encoding in ("utf-8", "cp949"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError("config", b"", 0, 1, f"Unable to decode {path} as utf-8 or cp949")


def load_config(config_path: Path) -> Dict[str, str]:
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    raw_text = load_text_with_fallback(config_path)
    config: Dict[str, str] = {}
    for line_number, raw in enumerate(raw_text.splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"Invalid config line {line_number}: '{raw}' (expected KEY=VALUE)")
        key, value = line.split("=", 1)
        config[key.strip()] = value.strip()

    missing = [k for k in REQUIRED_CONFIG_KEYS if not config.get(k)]
    if missing:
        raise ValueError(f"Missing required config values: {', '.join(missing)}")

    try:
        int(config["LOOP_INTERVAL_SECONDS"])
    except ValueError as exc:
        raise ValueError("LOOP_INTERVAL_SECONDS must be an integer") from exc

    return config


def run_command(
    cmd: str,
    *,
    cwd: Optional[Path] = None,
    timeout: int = 300,
    env: Optional[Dict[str, str]] = None,
) -> subprocess.CompletedProcess[str]:
    LOGGER.debug("Running command: %s", cmd)
    return subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        shell=True,
        check=False,
        timeout=timeout,
        text=True,
        capture_output=True,
        env=env,
    )


def get_git_diff_summary(repo_path: Path, max_lines: int = 80) -> str:
    diff_cmd = "git diff --stat && echo '---' && git diff --name-only"
    result = run_command(diff_cmd, cwd=repo_path, timeout=120)
    if result.returncode != 0:
        return f"git diff failed: {result.stderr.strip()}"
    lines = result.stdout.strip().splitlines()
    if len(lines) > max_lines:
        lines = lines[:max_lines] + [f"... ({len(lines) - max_lines} lines omitted)"]
    return "\n".join(lines)


def get_git_head_sha(repo_path: Path) -> Optional[str]:
    result = run_command("git rev-parse HEAD", cwd=repo_path, timeout=30)
    if result.returncode != 0:
        LOGGER.warning("Failed to read HEAD SHA: %s", result.stderr.strip())
        return None
    return result.stdout.strip()


def get_git_branch(repo_path: Path) -> Optional[str]:
    result = run_command("git rev-parse --abbrev-ref HEAD", cwd=repo_path, timeout=30)
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def write_json(path: Path, payload: Dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def extract_screenshot_urls(text: str) -> List[str]:
    url_pattern = re.compile(r"https?://[^\s\]\)\"'>]+", re.IGNORECASE)
    urls = []
    for url in url_pattern.findall(text or ""):
        lower = url.lower()
        if any(token in lower for token in ("screenshot", ".png", ".jpg", ".jpeg", ".webp")):
            urls.append(url)
    return list(dict.fromkeys(urls))


def render_template(template_text: str, variables: Dict[str, str]) -> str:
    rendered = template_text
    for key, value in variables.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
    return rendered


def truncate(text: str, size: int = 2000) -> str:
    if text is None:
        return ""
    if len(text) <= size:
        return text
    return text[:size] + "\n...<truncated>"


def ensure_dirs(paths: Iterable[Path]) -> None:
    for p in paths:
        p.mkdir(parents=True, exist_ok=True)
