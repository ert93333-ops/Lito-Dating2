from __future__ import annotations

import copy
from pathlib import Path
from typing import Any, Dict

from utils import now_iso, write_json

DEFAULT_STATE: Dict[str, Any] = {
    "project": "Lito-Dating2",
    "current_state": "IDLE",
    "paused": False,
    "current_task": None,
    "retry_count": 0,
    "last_safe_commit": None,
    "last_codex_summary": None,
    "last_manus_report": None,
    "last_report_path": None,
    "last_error": None,
    "last_research_request": None,
    "updated_at": None,
}


class StateStore:
    def __init__(self, path: Path):
        self.path = path

    def load(self) -> Dict[str, Any]:
        if not self.path.exists():
            state = copy.deepcopy(DEFAULT_STATE)
            state["updated_at"] = now_iso()
            self.save(state)
            return state
        import json

        with self.path.open("r", encoding="utf-8") as f:
            loaded = json.load(f)
        state = copy.deepcopy(DEFAULT_STATE)
        state.update(loaded)
        if not state.get("updated_at"):
            state["updated_at"] = now_iso()
        return state

    def save(self, state: Dict[str, Any]) -> None:
        state["updated_at"] = now_iso()
        write_json(self.path, state)
