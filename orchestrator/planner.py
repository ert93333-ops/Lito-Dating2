from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict

import requests

from utils import render_template, truncate

LOGGER = logging.getLogger(__name__)


class PlannerError(RuntimeError):
    pass


def _extract_json(raw: str) -> Dict[str, Any]:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json\n", "", 1).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            return json.loads(raw[start : end + 1])
        raise


def _validate_plan(plan: Dict[str, Any]) -> None:
    required = [
        "task_title",
        "priority",
        "goal",
        "scope_limit",
        "acceptance_criteria",
        "rollback_if",
        "thought_summary",
        "codex_prompt",
        "manus_prompt",
        "research_request",
    ]
    missing = [k for k in required if k not in plan]
    if missing:
        raise PlannerError(f"Planner response missing keys: {', '.join(missing)}")


def make_plan(config: Dict[str, str], prompt_dir: Path, state: Dict[str, Any]) -> Dict[str, Any]:
    system_prompt = (prompt_dir / "planner_system.txt").read_text(encoding="utf-8")
    user_template = (prompt_dir / "planner_user_template.txt").read_text(encoding="utf-8")

    user_prompt = render_template(
        user_template,
        {
            "current_state": state.get("current_state"),
            "current_task": json.dumps(state.get("current_task"), ensure_ascii=False),
            "retry_count": state.get("retry_count"),
            "last_error": state.get("last_error") or "None",
            "last_codex_summary": truncate(state.get("last_codex_summary") or "None", 1600),
            "last_manus_report": truncate(state.get("last_manus_report") or "None", 1600),
        },
    )

    headers = {
        "Authorization": f"Bearer {config['OPENAI_API_KEY']}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config["OPENAI_MODEL"],
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
            {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
        ],
    }

    resp = requests.post("https://api.openai.com/v1/responses", headers=headers, json=payload, timeout=90)
    if resp.status_code >= 400:
        raise PlannerError(f"OpenAI planner API error ({resp.status_code}): {resp.text[:500]}")

    body = resp.json()
    output_text = body.get("output_text")
    if not output_text:
        output_text = json.dumps(body, ensure_ascii=False)

    try:
        plan = _extract_json(output_text)
    except Exception as exc:
        LOGGER.error("Planner output parse failure: %s", output_text)
        raise PlannerError(f"Planner JSON parse error: {exc}") from exc

    _validate_plan(plan)

    # Research request gate: only when rollback blockers are empty.
    if plan.get("research_request") and plan.get("rollback_if"):
        if len(plan["rollback_if"]) > 0:
            plan["research_request"] = None

    return plan
