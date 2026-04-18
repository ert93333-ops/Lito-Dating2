from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

import requests

from utils import render_template, truncate

LOGGER = logging.getLogger(__name__)


class PlannerError(RuntimeError):
    pass


def _extract_output_text(body: Dict[str, Any]) -> str:
    if body.get("output_text"):
        return str(body["output_text"])

    parts = []
    for item in body.get("output", []) or []:
        for content in item.get("content", []) or []:
            text = content.get("text")
            if text:
                parts.append(str(text))
    if parts:
        return "\n".join(parts)

    return json.dumps(body, ensure_ascii=False)


def _extract_json(raw: str) -> Dict[str, Any]:
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    cleaned = raw
    if cleaned.startswith("```"):
        cleaned = cleaned.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[len("```json") :]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        return json.loads(cleaned[start : end + 1])
    raise json.JSONDecodeError("Could not find JSON object in planner response", cleaned, 0)


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
    system_prompt = f"{system_prompt}\n\nReturn valid JSON only. No explanation."
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
        "temperature": 0,
        "max_output_tokens": 2000,
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
            {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
        ],
    }

    resp = requests.post("https://api.openai.com/v1/responses", headers=headers, json=payload, timeout=90)
    if resp.status_code >= 400:
        raise PlannerError(f"OpenAI planner API error ({resp.status_code}): {resp.text[:500]}")

    body = resp.json()
    output_text = _extract_output_text(body)
    logs_dir = prompt_dir.parent / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    raw_path = logs_dir / f"planner_raw_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.log"
    raw_path.write_text(output_text, encoding="utf-8")

    try:
        plan = _extract_json(output_text)
    except Exception as exc:
        LOGGER.error("Planner output parse failure. raw_preview=%s", truncate(output_text, 500))
        preview = truncate(output_text.replace("\n", " "), 300)
        raise PlannerError(
            f"Planner JSON parse error: {exc} (raw_log={raw_path}, raw_preview={preview})"
        ) from exc

    if "research_request" not in plan:
        plan["research_request"] = None

    try:
        _validate_plan(plan)
    except PlannerError as exc:
        LOGGER.error("%s", exc)
        LOGGER.error("Planner raw response preview: %s", truncate(output_text, 500))
        raise PlannerError(f"{exc} (raw_log={raw_path})") from exc

    plan["_raw_response_path"] = str(raw_path)
    plan["_raw_response_preview"] = truncate(output_text, 2000)

    # Research request gate: only when rollback blockers are empty.
    if plan.get("research_request") and plan.get("rollback_if"):
        if len(plan["rollback_if"]) > 0:
            plan["research_request"] = None

    return plan
