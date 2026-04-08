"""
scorer.py — session_aptitude 4개 점수 산출 (0‒100)

점수 설계 원칙:
  logic_score    : LOGIC 요청 비율 + 에러 시도 횟수(참여도) + 퀴즈 정답률 + 자립도
  planning_score : PLANNING 요청 비율 + 자립도 (기획 성향 = 코드보다 구조 탐색)
  ux_score       : UX 요청 비율 + 자립도
  data_score     : DATA 요청 비율 + 퀴즈 정답률 (데이터 성향 = 정확도 중시)

각 항목은 0‒100 범위로 정규화됩니다.
"""
from __future__ import annotations

from insight.analyzer import BehaviorMetrics


def _normalize(value: float, max_value: float) -> float:
    """value를 [0, max_value] 범위에서 [0, 1]로 정규화."""
    if max_value <= 0:
        return 0.0
    return min(1.0, value / max_value)


def calculate_session_aptitude(metrics: BehaviorMetrics) -> dict[str, float]:
    """
    BehaviorMetrics → session_aptitude 딕셔너리 (logic/planning/ux/data 각 0‒100).
    """
    cats = metrics.wing_request_categories
    total_requests = sum(cats.values()) or 1

    # 카테고리별 비율
    logic_ratio    = cats.get("LOGIC",    0) / total_requests
    planning_ratio = cats.get("PLANNING", 0) / total_requests
    ux_ratio       = cats.get("UX",       0) / total_requests
    data_ratio     = cats.get("DATA",     0) / total_requests

    # 참여도: HARNESS_ERROR 직접 시도 (최대 기준 15회)
    attempt_score = _normalize(metrics.harness_error_count, 15)

    # 퀴즈 정답률
    quiz_rate = (
        metrics.quiz_correct / metrics.quiz_total
        if metrics.quiz_total > 0 else 0.0
    )

    # 자립도
    autonomy = metrics.autonomy_score

    # 집중도
    focus = metrics.focus_ratio

    # ── 4개 점수 산출 ────────────────────────────────────────────────────
    # Logic : 직접 코드 탐구 → 에러 시도, 퀴즈 정확도, 자립도, LOGIC 요청
    logic_score = (
        logic_ratio    * 0.30 +
        attempt_score  * 0.30 +
        quiz_rate      * 0.25 +
        autonomy       * 0.15
    ) * 100

    # Planning : 기획·구조 질문 → PLANNING 요청, 집중도, 자립도
    planning_score = (
        planning_ratio * 0.55 +
        focus          * 0.25 +
        autonomy       * 0.20
    ) * 100

    # UX : UI/흐름 질문 → UX 요청, 자립도
    ux_score = (
        ux_ratio  * 0.70 +
        autonomy  * 0.30
    ) * 100

    # Data : 데이터 관련 → DATA 요청, 퀴즈 정답률 (정확도 중시)
    data_score = (
        data_ratio * 0.55 +
        quiz_rate  * 0.30 +
        focus      * 0.15
    ) * 100

    return {
        "logic_score":    round(logic_score,    2),
        "planning_score": round(planning_score, 2),
        "ux_score":       round(ux_score,       2),
        "data_score":     round(data_score,     2),
    }


def update_profile_averages(
    current_avg: dict[str, float],
    session_count: int,
    new_scores: dict[str, float],
) -> dict[str, float]:
    """
    누적 평균을 incremental 방식으로 업데이트합니다.
    current_avg : {"logic_avg": ..., "planning_avg": ..., "ux_avg": ..., "data_avg": ...}
    새 세션이 추가되었을 때 호출 (session_count는 업데이트 전 값).
    """
    n = session_count  # 이전 세션 수
    mapping = {
        "logic_avg":    "logic_score",
        "planning_avg": "planning_score",
        "ux_avg":       "ux_score",
        "data_avg":     "data_score",
    }
    updated: dict[str, float] = {}
    for avg_key, score_key in mapping.items():
        prev_avg = current_avg.get(avg_key, 0.0)
        new_val  = new_scores.get(score_key, 0.0)
        updated[avg_key] = round((prev_avg * n + new_val) / (n + 1), 4)
    return updated
