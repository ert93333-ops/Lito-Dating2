"""
Manus API v2 클라이언트
=======================
open.manus.im API를 사용하여 태스크를 생성하고 결과를 수신한다.

엔드포인트:
  POST /v2/task.create        - 새 태스크 생성
  GET  /v2/task.detail        - 태스크 상태 조회
  GET  /v2/task.listMessages  - 태스크 메시지 이력 조회
  POST /v2/task.sendMessage   - 실행 중인 태스크에 메시지 전송
"""

import os
import time
import logging
import requests
from typing import Optional

log = logging.getLogger("manus_client")

MANUS_API_BASE = "https://api.manus.im/v2"


class ManusClient:
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("MANUS_API_KEY가 설정되지 않았습니다.")
        self.api_key = api_key
        self.headers = {
            "x-manus-api-key": api_key,
            "Content-Type": "application/json",
        }

    def create_task(self, prompt: str) -> str:
        """태스크를 생성하고 task_id를 반환한다."""
        resp = requests.post(
            f"{MANUS_API_BASE}/task.create",
            json={"prompt": prompt},
            headers=self.headers,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        task_id = data.get("task_id") or data.get("id") or data.get("taskId")
        if not task_id:
            raise RuntimeError(f"task_id를 찾을 수 없습니다: {data}")
        log.info(f"태스크 생성 완료: {task_id}")
        return task_id

    def get_task_status(self, task_id: str) -> dict:
        """태스크 상태를 조회한다."""
        resp = requests.get(
            f"{MANUS_API_BASE}/task.detail",
            params={"task_id": task_id},
            headers=self.headers,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    def list_messages(self, task_id: str) -> list:
        """태스크의 메시지 이력을 반환한다."""
        resp = requests.get(
            f"{MANUS_API_BASE}/task.listMessages",
            params={"task_id": task_id},
            headers=self.headers,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("messages", data if isinstance(data, list) else [])

    def send_message(self, task_id: str, message: str) -> dict:
        """실행 중인 태스크에 추가 메시지를 전송한다."""
        resp = requests.post(
            f"{MANUS_API_BASE}/task.sendMessage",
            json={"task_id": task_id, "message": message},
            headers=self.headers,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    def wait_for_completion(self, task_id: str, max_minutes: int = 30,
                            poll_interval: int = 30) -> str:
        """
        태스크가 완료될 때까지 폴링하고 최종 보고서 텍스트를 반환한다.
        """
        deadline = time.time() + max_minutes * 60
        completed_statuses = {"completed", "finished", "done", "success"}
        failed_statuses = {"failed", "error", "cancelled"}

        while time.time() < deadline:
            try:
                data = self.get_task_status(task_id)
                status = str(data.get("status", "")).lower()
                log.info(f"  태스크 상태: {status}")

                if status in completed_statuses:
                    messages = self.list_messages(task_id)
                    # 마지막 assistant 메시지 반환
                    for msg in reversed(messages):
                        role = msg.get("role", "").lower()
                        if role in ("assistant", "agent", "manus"):
                            content = msg.get("content", "")
                            if content:
                                log.info(f"  보고서 수신 ({len(content)}자)")
                                return content
                    return "보고서 내용 없음"

                elif status in failed_statuses:
                    return f"태스크 실패: {status}\n{data}"

            except requests.HTTPError as e:
                log.warning(f"  API 오류 (재시도): {e}")
            except Exception as e:
                log.warning(f"  폴링 오류 (재시도): {e}")

            time.sleep(poll_interval)

        return f"대기 시간 초과 ({max_minutes}분)"


def create_test_task_prompt(instructions: dict, github_repo: str,
                             codex_status: str) -> str:
    """Manus에게 전달할 테스트 태스크 프롬프트를 생성한다."""
    return f"""GitHub 저장소 {github_repo} 를 클론하고 다음 검증 작업을 수행하세요.

## 방금 완료된 Codex 작업
- **작업명:** {instructions.get('task_title', 'N/A')}
- **Codex 상태:** {codex_status}

## 테스트 시나리오
{instructions.get('test_scenario', '전반적인 기능 테스트')}

## 수행할 검증 단계
1. `git clone https://github.com/{github_repo}.git` 또는 `git pull` 로 최신 코드 받기
2. `pnpm install` 실행 및 결과 확인
3. TypeScript 빌드 확인 (`npx tsc --noEmit`)
4. API 서버 실행 후 `/api/health` 엔드포인트 테스트
5. Expo 앱 웹 모드 실행 가능 여부 확인
6. 위 테스트 시나리오 검증

## 보고서 형식 (반드시 이 형식으로 출력)
# LITO 자동화 테스트 보고서

## 실행 가능 여부: O / X

## 검증 결과
| 항목 | 결과 | 비고 |
|------|------|------|
| pnpm install | ✅/❌ | |
| TypeScript 빌드 | ✅/❌ | |
| API 서버 실행 | ✅/❌ | |
| health check | ✅/❌ | |

## 발견된 오류
(오류 내용 상세 기술)

## 아직 남은 Blocker

## 다음 수정 우선순위 TOP 3
1.
2.
3.

## 실제 네트워크 요청 로그
(curl 결과 등)
"""
