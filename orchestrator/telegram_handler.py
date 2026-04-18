from __future__ import annotations

import logging
import queue
import threading
import time
from typing import Dict, Optional

import requests

LOGGER = logging.getLogger(__name__)


class TelegramHandler:
    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = str(chat_id)
        self.base_url = f"https://api.telegram.org/bot{token}"
        self.offset: Optional[int] = None
        self.commands: "queue.Queue[str]" = queue.Queue()
        self.stop_event = threading.Event()
        self.thread: Optional[threading.Thread] = None

    def start(self) -> None:
        if self.thread and self.thread.is_alive():
            return
        self.thread = threading.Thread(target=self._poll_loop, name="telegram-poll", daemon=True)
        self.thread.start()

    def stop(self) -> None:
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=2)

    def _poll_loop(self) -> None:
        while not self.stop_event.is_set():
            try:
                params = {"timeout": 25}
                if self.offset is not None:
                    params["offset"] = self.offset
                resp = requests.get(f"{self.base_url}/getUpdates", params=params, timeout=35)
                if resp.status_code >= 400:
                    LOGGER.warning("Telegram getUpdates failed: %s", resp.text[:200])
                    time.sleep(3)
                    continue
                data = resp.json()
                for item in data.get("result", []):
                    self.offset = item["update_id"] + 1
                    message = item.get("message") or {}
                    chat = message.get("chat") or {}
                    if str(chat.get("id")) != self.chat_id:
                        continue
                    text = (message.get("text") or "").strip()
                    if text.startswith("/"):
                        self.commands.put(text.split()[0].lower())
            except Exception as exc:
                LOGGER.exception("Telegram poll error: %s", exc)
                time.sleep(3)

    def get_command_nowait(self) -> Optional[str]:
        try:
            return self.commands.get_nowait()
        except queue.Empty:
            return None

    def send_message(self, text: str) -> None:
        payload = {"chat_id": self.chat_id, "text": text}
        try:
            resp = requests.post(f"{self.base_url}/sendMessage", json=payload, timeout=30)
            if resp.status_code >= 400:
                LOGGER.warning("Telegram sendMessage failed: %s", resp.text[:200])
        except Exception as exc:
            LOGGER.exception("Telegram send error: %s", exc)
