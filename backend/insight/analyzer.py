"""
analyzer.py — 타임스탬프 기반 행동 패턴 분석

[insight_system_prompt.md 준수]
- 집중도  : FOCUS_OUT/IN 타임스탬프 차이로 순수 학습 시간 도출
- 참여도  : HARNESS_ERROR 이벤트 횟수 (힌트 전 직접 시도 빈도)
- 자립도  : INPUT_TYPE.is_paste 비율 → 외부 코드 의존도
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone


_INTEREST_CATEGORIES = [
    "패션", "의료", "펫", "게임", "금융", "교육", "커머스", "음식", "기타"
]

_INTEREST_SYSTEM_PROMPT = f"""사용자의 코딩 학습 중 질문 목록을 분석해 관심사를 추출하세요.
반드시 JSON만 응답하세요:
{{
  "category": "{'/'.join(_INTEREST_CATEGORIES)} 중 하나",
  "keywords": ["핵심 키워드 최대 3개"]
}}"""


# ── 결과 타입 ──────────────────────────────────────────────────────────────

@dataclass
class BehaviorMetrics:
    """단일 세션의 행동 지표."""
    total_seconds: float          # 세션 전체 경과 시간
    focused_seconds: float        # 순수 집중 시간
    distracted_seconds: float     # 이탈(FOCUS_OUT) 누적 시간
    focus_ratio: float            # focused / total (0‒1)
    harness_error_count: int      # HARNESS_ERROR 총 횟수 (직접 시도 지표)
    paste_count: int              # 붙여넣기 횟수
    input_count: int              # 전체 입력 이벤트 수
    paste_ratio: float            # paste / input (0‒1, 자립도 역지표)
    autonomy_score: float         # 1 - paste_ratio (0‒1)
    wing_request_categories: dict[str, int] = field(default_factory=dict)
    quiz_correct: int = 0
    quiz_total: int = 0


# ── 파서 ───────────────────────────────────────────────────────────────────

def _parse_ts(ts_str: str) -> datetime:
    """ISO 8601 문자열 → tz-aware datetime (UTC)."""
    dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# ── 핵심 분석 함수 ─────────────────────────────────────────────────────────

def analyze_session(
    timestamp_start: str,
    logs: list[dict],
) -> BehaviorMetrics:
    """
    activity_log의 logs 배열을 분석하여 BehaviorMetrics를 반환합니다.

    Args:
        timestamp_start: 세션 시작 ISO 8601 타임스탬프
        logs: activity_log.json의 logs 배열

    Returns:
        BehaviorMetrics
    """
    if not logs:
        return BehaviorMetrics(
            total_seconds=0, focused_seconds=0, distracted_seconds=0,
            focus_ratio=0, harness_error_count=0, paste_count=0,
            input_count=0, paste_ratio=0, autonomy_score=1.0,
        )

    session_start = _parse_ts(timestamp_start)

    # 타임스탬프 기준 정렬
    sorted_logs = sorted(logs, key=lambda e: e.get("timestamp", ""))

    # 세션 종료 시각 = 마지막 로그 타임스탬프
    last_ts = _parse_ts(sorted_logs[-1]["timestamp"])
    total_seconds = max((last_ts - session_start).total_seconds(), 0)

    # ── FOCUS_CHANGE 기반 이탈 시간 계산 ──────────────────────────────────
    distracted_seconds = 0.0
    focus_out_time: datetime | None = None

    for event in sorted_logs:
        if event.get("event_type") != "FOCUS_CHANGE":
            continue
        data = event.get("data", {})
        ts = _parse_ts(event["timestamp"])

        if data.get("state") == "FOCUS_OUT":
            focus_out_time = ts
        elif data.get("state") == "FOCUS_IN" and focus_out_time is not None:
            elapsed = (ts - focus_out_time).total_seconds()
            if elapsed > 0:
                distracted_seconds += elapsed
            focus_out_time = None

    # 세션 종료 시 아직 FOCUS_OUT 중이면 마지막 로그까지를 이탈로 간주
    if focus_out_time is not None:
        elapsed = (last_ts - focus_out_time).total_seconds()
        if elapsed > 0:
            distracted_seconds += elapsed

    focused_seconds = max(total_seconds - distracted_seconds, 0)
    focus_ratio = focused_seconds / total_seconds if total_seconds > 0 else 0.0

    # ── INPUT_TYPE 기반 자립도 계산 ───────────────────────────────────────
    input_events = [e for e in logs if e.get("event_type") == "INPUT_TYPE"]
    paste_count = sum(
        1 for e in input_events if e.get("data", {}).get("is_paste", False)
    )
    input_count = len(input_events)
    paste_ratio = paste_count / input_count if input_count > 0 else 0.0
    autonomy_score = 1.0 - paste_ratio

    # ── HARNESS_ERROR 집계 ────────────────────────────────────────────────
    harness_error_count = sum(
        e.get("data", {}).get("error_count", 1)
        for e in logs
        if e.get("event_type") == "HARNESS_ERROR"
    )

    # ── WING_REQUEST 카테고리 집계 ────────────────────────────────────────
    categories: dict[str, int] = {}
    for e in logs:
        if e.get("event_type") == "WING_REQUEST":
            cat = e.get("data", {}).get("category", "LOGIC")
            categories[cat] = categories.get(cat, 0) + 1

    # ── QUIZ_RESULT 집계 ─────────────────────────────────────────────────
    quiz_events = [e for e in logs if e.get("event_type") == "QUIZ_RESULT"]
    quiz_correct = sum(
        1 for e in quiz_events if e.get("data", {}).get("is_correct", False)
    )

    return BehaviorMetrics(
        total_seconds=round(total_seconds, 1),
        focused_seconds=round(focused_seconds, 1),
        distracted_seconds=round(distracted_seconds, 1),
        focus_ratio=round(focus_ratio, 3),
        harness_error_count=harness_error_count,
        paste_count=paste_count,
        input_count=input_count,
        paste_ratio=round(paste_ratio, 3),
        autonomy_score=round(autonomy_score, 3),
        wing_request_categories=categories,
        quiz_correct=quiz_correct,
        quiz_total=len(quiz_events),
    )


# ── 관심사 분석 ────────────────────────────────────────────────────────────

async def analyze_interests(prompt_summaries: list[str]) -> dict[str, object]:
    """
    WING_REQUEST 이벤트의 prompt_summary 목록을 Claude API로 분석합니다.

    Args:
        prompt_summaries: WING_REQUEST.data.prompt_summary 문자열 목록

    Returns:
        { "category": str, "keywords": list[str] }
        API 호출 실패 시 { "category": "기타", "keywords": [] }
    """
    import anthropic  # 런타임 import — 미설치 환경에서 서버 기동 가능하도록

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or not prompt_summaries:
        return {"category": "기타", "keywords": []}

    # 질문 목록을 하나의 텍스트로 결합 (최대 20개, 각 100자 이하)
    combined = "\n".join(
        f"- {s[:100]}" for s in prompt_summaries[:20]
    )

    client = anthropic.AsyncAnthropic(api_key=api_key)
    try:
        res = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=256,
            system=_INTEREST_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": combined}],
        )
        raw = res.content[0].text
        parsed = json.loads(raw)
        category = parsed.get("category", "기타")
        if category not in _INTEREST_CATEGORIES:
            category = "기타"
        keywords = [str(k) for k in parsed.get("keywords", [])[:3]]
        return {"category": category, "keywords": keywords}
    except Exception:
        return {"category": "기타", "keywords": []}
