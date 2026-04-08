"""
redflag.py — RED_FLAG 감지 및 Slack 알림

[insight_system_prompt.md 3. 경보 시스템 준수]
  감지 조건  : 집중 시간 또는 참여도가 3회 연속 유의미하게 하락
  원인 판별  :
    DIFFICULTY    → 에러 횟수 높음 + 시도 빈도 높음
    DISENGAGEMENT → 접속 시간 감소 + 시도 빈도 낮음
  심각도     :
    HIGH → 집중도·참여도 모두 3회 연속 하락
    MID  → 둘 중 하나만 3회 연속 하락
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import httpx

from core.config import settings

# 유의미한 하락 기준 (전 세션 대비 감소율)
DECLINE_THRESHOLD = 0.15   # 15% 이상 하락
CONSECUTIVE_COUNT = 3      # 연속 하락 횟수


# ── 세션 지표 스냅샷 ──────────────────────────────────────────────────────

@dataclass
class SessionSnapshot:
    """RED_FLAG 판별에 필요한 세션별 핵심 지표."""
    session_id: str
    focus_ratio: float          # 집중 시간 비율 (0‒1)
    harness_error_count: int    # HARNESS_ERROR 횟수 (직접 시도 빈도)
    focused_seconds: float      # 절대 집중 시간


# ── 하락 감지 ─────────────────────────────────────────────────────────────

def _is_declining(values: list[float]) -> bool:
    """
    연속된 값 목록에서 각 쌍이 DECLINE_THRESHOLD 이상 하락하는지 확인합니다.
    values[0]이 가장 오래된 세션, values[-1]이 최신 세션.
    """
    if len(values) < 2:
        return False
    for prev, curr in zip(values, values[1:]):
        if prev <= 0:
            return False
        decline_rate = (prev - curr) / prev
        if decline_rate < DECLINE_THRESHOLD:
            return False
    return True


def detect_redflag(
    recent_sessions: list[SessionSnapshot],
) -> dict | None:
    """
    최근 CONSECUTIVE_COUNT개 세션을 분석하여 RED_FLAG 여부를 판별합니다.

    Args:
        recent_sessions: 시간 오름차순 정렬된 최근 세션 스냅샷 목록

    Returns:
        RED_FLAG 감지 시 {"severity": ..., "reason": ..., "cause": ...} 딕셔너리.
        감지되지 않으면 None.
    """
    if len(recent_sessions) < CONSECUTIVE_COUNT:
        return None

    window = recent_sessions[-CONSECUTIVE_COUNT:]

    focus_values  = [s.focus_ratio         for s in window]
    effort_values = [float(s.harness_error_count) for s in window]
    time_values   = [s.focused_seconds     for s in window]

    focus_declining  = _is_declining(focus_values)
    effort_declining = _is_declining(effort_values)

    if not focus_declining and not effort_declining:
        return None

    # ── 심각도 판별 ───────────────────────────────────────────────────────
    severity: Literal["HIGH", "MID"] = "HIGH" if (focus_declining and effort_declining) else "MID"

    # ── 원인 판별 (insight_system_prompt.md 준수) ─────────────────────────
    avg_errors  = sum(s.harness_error_count for s in window) / CONSECUTIVE_COUNT
    avg_time    = sum(s.focused_seconds     for s in window) / CONSECUTIVE_COUNT

    # 난이도 원인: 에러 횟수 높음(≥5) + 시도 빈도 하락하지 않음
    # 참여도 저하: 접속 시간 감소 + 시도 빈도 낮음(< 5)
    if avg_errors >= 5 and not effort_declining:
        cause = "DIFFICULTY"
        coaching = (
            "에러 횟수가 높고 계속 시도 중입니다. "
            "난이도 조정 또는 개념 설명 보강을 권장합니다."
        )
    else:
        cause = "DISENGAGEMENT"
        coaching = (
            "접속 시간과 시도 빈도가 모두 감소하고 있습니다. "
            "동기 부여 면담 또는 학습 목표 재설정을 권장합니다."
        )

    reason = (
        f"최근 {CONSECUTIVE_COUNT}회 세션 연속 "
        f"{'집중도' if focus_declining else ''}"
        f"{' + ' if focus_declining and effort_declining else ''}"
        f"{'참여도' if effort_declining else ''} 하락 감지. "
        f"원인: {cause}. 코칭 가이드: {coaching}"
    )

    return {"severity": severity, "reason": reason, "cause": cause}


# ── Slack 알림 전송 ────────────────────────────────────────────────────────

async def send_redflag_alert(user_id: str, severity: str, reason: str) -> bool:
    """
    POST /alert/redflag 엔드포인트를 내부 HTTP로 호출하거나
    Slack Webhook을 직접 전송합니다.

    Returns:
        True  → 전송 성공
        False → 전송 실패 또는 Webhook 미설정
    """
    if not settings.SLACK_WEBHOOK_URL:
        return False

    severity_emoji = "🚨" if severity == "HIGH" else "⚠️"
    message = {
        "text": (
            f"{severity_emoji} *ICARUS RED FLAG*\n"
            f"*학생 ID* : {user_id}\n"
            f"*심각도*  : {severity}\n"
            f"*사유*    : {reason}"
        )
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(settings.SLACK_WEBHOOK_URL, json=message)
        return resp.status_code == 200
    except Exception:
        return False
