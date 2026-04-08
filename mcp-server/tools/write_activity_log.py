"""
write_activity_log — 타임스탬프를 포함한 행동 로그를 activity_log.json에 기록합니다.
- duration_seconds는 Extension에서 계산하지 않으며, 서버도 계산하지 않음 (명세 준수)
- INPUT_TYPE 이벤트 수신 시 idle time 추적용 타임스탬프를 갱신합니다.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

from security import resolve_safe_path

# check_idle_time이 참조하는 모듈 수준 변수
_last_input_time: datetime | None = None

LOG_FILE_REL = "activity_log.json"


def run(event_json: dict) -> dict:
    global _last_input_time

    # 서버 측 타임스탬프 주입 (Extension이 제공하지 않은 경우 보완)
    if "timestamp" not in event_json:
        event_json["timestamp"] = datetime.now(timezone.utc).isoformat()

    # INPUT_TYPE 이벤트 → idle 추적 갱신
    if event_json.get("event_type") == "INPUT_TYPE":
        _last_input_time = datetime.now(timezone.utc)

    # activity_log.json 경로 (프로젝트 루트 기준)
    log_path: Path = resolve_safe_path(LOG_FILE_REL)

    # 파일이 없거나 비어있으면 빈 배열로 초기화
    if not log_path.exists() or log_path.stat().st_size == 0:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        logs: list = []
    else:
        logs = json.loads(log_path.read_text(encoding="utf-8"))

    logs.append(event_json)
    log_path.write_text(json.dumps(logs, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"status": "logged", "event_type": event_json.get("event_type")}
