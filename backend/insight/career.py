"""
career.py — career_identity 태그 부여

[insight_system_prompt.md 1.5배 룰 준수]
  - 지속성: 최근 5회 이상 세션에서 꾸준히 상위권
  - 차별성: 해당 성향 점수 >= 본인 전체 평균 * 1.5
  - 제한  : 최대 2개 태그, 데이터 부족 시 미부여
"""
from __future__ import annotations

# (avg_key, tag_label) 매핑
_APTITUDE_TAGS: list[tuple[str, str]] = [
    ("logic_avg",    "#Logic"),
    ("planning_avg", "#Planning"),
    ("ux_avg",       "#UX"),
    ("data_avg",     "#Data"),
]

MIN_SESSIONS = 5        # 최소 세션 수
DOMINANCE_RATIO = 1.5   # 전체 평균 대비 배율


def assign_career_identity(
    session_count: int,
    cumulative_avg: dict[str, float],
) -> list[str]:
    """
    session_count와 누적 평균을 받아 career_identity 태그 목록을 반환합니다.

    Args:
        session_count   : 지금까지 분석된 세션 수
        cumulative_avg  : {"logic_avg": ..., "planning_avg": ..., "ux_avg": ..., "data_avg": ...}

    Returns:
        list[str] — 최대 2개의 "#태그" 문자열. 조건 미충족 시 빈 리스트.
    """
    # 조건 1: 최소 5회 세션
    if session_count < MIN_SESSIONS:
        return []

    scores = {k: cumulative_avg.get(k, 0.0) for k, _ in _APTITUDE_TAGS}
    values = list(scores.values())

    # 전체 평균 (4개 성향의 평균)
    overall_avg = sum(values) / len(values) if values else 0.0

    # 기준선이 0이면 태그 부여 불가 (데이터 부족)
    if overall_avg <= 0:
        return []

    threshold = overall_avg * DOMINANCE_RATIO

    # 조건 2: 1.5배 이상인 성향 수집 → 점수 내림차순 정렬 → 최대 2개
    qualified = [
        (tag, scores[avg_key])
        for avg_key, tag in _APTITUDE_TAGS
        if scores[avg_key] >= threshold
    ]
    qualified.sort(key=lambda x: x[1], reverse=True)

    return [tag for tag, _ in qualified[:2]]


def build_career_summary(
    session_count: int,
    cumulative_avg: dict[str, float],
    current_tags: list[str],
) -> dict:
    """
    career_identity 결정 근거를 포함한 요약 딕셔너리를 반환합니다.
    (Insight 리포트 ai_comment 생성에 활용)
    """
    new_tags = assign_career_identity(session_count, cumulative_avg)
    tags_changed = set(new_tags) != set(current_tags)

    overall_avg = sum(cumulative_avg.values()) / 4 if cumulative_avg else 0.0

    return {
        "career_identity": new_tags,
        "tags_changed": tags_changed,
        "session_count": session_count,
        "overall_avg": round(overall_avg, 2),
        "threshold": round(overall_avg * DOMINANCE_RATIO, 2),
        "eligible": session_count >= MIN_SESSIONS,
    }
