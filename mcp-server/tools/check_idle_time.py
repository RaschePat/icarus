"""
check_idle_time — 마지막 INPUT_TYPE 이벤트 이후 경과된 시간(초)을 반환합니다.
write_activity_log 모듈의 _last_input_time을 공유합니다.
"""
from datetime import datetime, timezone

import tools.write_activity_log as _log_module


def run() -> dict:
    last = _log_module._last_input_time
    if last is None:
        return {"idle_seconds": None, "message": "아직 입력 이벤트가 기록되지 않았습니다."}

    elapsed = (datetime.now(timezone.utc) - last).total_seconds()
    return {"idle_seconds": round(elapsed, 1)}
