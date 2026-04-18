from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, List, Optional

import requests

from utils import extract_screenshot_urls, truncate

LOGGER = logging.getLogger(__name__)


class ManusError(RuntimeError):
    pass


class ManusRunner:
    def __init__(self, config: Dict[str, str]):
        self.base_url = config["MANUS_BASE_URL"].rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {config['MANUS_API_KEY']}",
            "Content-Type": "application/json",
        }

    def _parse_response(self, payload: Any) -> Dict[str, Any]:
        if isinstance(payload, dict):
            return payload
        if isinstance(payload, str):
            try:
                return json.loads(payload)
            except json.JSONDecodeError:
                return {"text": payload}
        return {"raw": payload}

    def run_qa(self, prompt: str, timeout_seconds: int = 900, poll_seconds: int = 10) -> Dict[str, Any]:
        create_payload = {
            "task_type": "qa",
            "input": prompt,
        }
        create_resp = requests.post(
            f"{self.base_url}/tasks",
            headers=self.headers,
            json=create_payload,
            timeout=60,
        )
        if create_resp.status_code >= 400:
            raise ManusError(f"Manus task creation failed ({create_resp.status_code}): {create_resp.text[:500]}")

        create_json = self._parse_response(create_resp.json())
        task_id = create_json.get("task_id") or create_json.get("id")
        if not task_id:
            raise ManusError(f"Manus task_id missing: {create_json}")

        deadline = time.time() + timeout_seconds
        last_payload: Dict[str, Any] = {}
        while time.time() < deadline:
            status_resp = requests.get(
                f"{self.base_url}/tasks/{task_id}",
                headers=self.headers,
                timeout=60,
            )
            if status_resp.status_code >= 400:
                raise ManusError(f"Manus polling failed ({status_resp.status_code}): {status_resp.text[:500]}")

            status_payload = self._parse_response(status_resp.json())
            last_payload = status_payload
            status = str(status_payload.get("status", "")).upper()
            if status in {"SUCCEEDED", "SUCCESS", "COMPLETED", "DONE"}:
                break
            if status in {"FAILED", "ERROR", "CANCELED"}:
                raise ManusError(f"Manus task failed: {status_payload}")
            time.sleep(poll_seconds)
        else:
            raise ManusError(f"Manus task timeout for task_id={task_id}")

        final_text = (
            status_payload.get("report")
            or status_payload.get("output")
            or status_payload.get("message")
            or json.dumps(status_payload, ensure_ascii=False)
        )
        screenshot_urls = self.extract_screenshot_urls_from_result(status_payload, final_text)
        return {
            "ok": True,
            "task_id": task_id,
            "status": status_payload.get("status"),
            "report_text": truncate(final_text, 5000),
            "screenshot_urls": screenshot_urls,
            "raw": last_payload,
        }

    @staticmethod
    def extract_screenshot_urls_from_result(status_payload: Dict[str, Any], fallback_text: str) -> List[str]:
        urls: List[str] = []

        def walk(node: Any) -> None:
            if isinstance(node, str):
                urls.extend(extract_screenshot_urls(node))
            elif isinstance(node, dict):
                for v in node.values():
                    walk(v)
            elif isinstance(node, list):
                for i in node:
                    walk(i)

        walk(status_payload)
        if not urls:
            urls.extend(extract_screenshot_urls(fallback_text))
        return list(dict.fromkeys(urls))
