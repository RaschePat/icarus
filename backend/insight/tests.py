"""
insight/tests.py — Insight 엔진 단위 테스트 (DB 없이 실행 가능)
실행: cd backend && python -m insight.tests
"""
from __future__ import annotations

from insight.analyzer import analyze_session
from insight.scorer import calculate_session_aptitude, update_profile_averages
from insight.career import assign_career_identity, build_career_summary
from insight.redflag import detect_redflag, SessionSnapshot


def _make_logs() -> list[dict]:
    """테스트용 activity_log.logs 배열."""
    return [
        # FOCUS_OUT 10분 (이탈)
        {"timestamp": "2025-01-01T10:00:00+00:00", "event_type": "FOCUS_CHANGE",
         "data": {"state": "FOCUS_OUT", "trigger": "WINDOW_BLUR"}},
        {"timestamp": "2025-01-01T10:10:00+00:00", "event_type": "FOCUS_CHANGE",
         "data": {"state": "FOCUS_IN", "trigger": "WINDOW_FOCUS"}},
        # INPUT_TYPE × 8 (3개 paste)
        *[{"timestamp": "2025-01-01T10:11:00+00:00", "event_type": "INPUT_TYPE",
           "data": {"is_paste": i < 3, "file_extension": "java"}} for i in range(8)],
        # WING_REQUEST × 3 (LOGIC×2, PLANNING×1)
        {"timestamp": "2025-01-01T10:15:00+00:00", "event_type": "WING_REQUEST",
         "data": {"category": "LOGIC", "prompt_summary": "정렬 로직이 뭔가요?"}},
        {"timestamp": "2025-01-01T10:20:00+00:00", "event_type": "WING_REQUEST",
         "data": {"category": "LOGIC", "prompt_summary": "Comparator 사용법"}},
        {"timestamp": "2025-01-01T10:25:00+00:00", "event_type": "WING_REQUEST",
         "data": {"category": "PLANNING", "prompt_summary": "전체 흐름 설명해줘"}},
        # HARNESS_ERROR × 2
        {"timestamp": "2025-01-01T10:30:00+00:00", "event_type": "HARNESS_ERROR",
         "data": {"error_count": 3, "logic_id": "logic-001"}},
        {"timestamp": "2025-01-01T10:35:00+00:00", "event_type": "HARNESS_ERROR",
         "data": {"error_count": 2, "logic_id": "logic-001"}},
        # QUIZ_RESULT × 2 (1정답)
        {"timestamp": "2025-01-01T10:40:00+00:00", "event_type": "QUIZ_RESULT",
         "data": {"quiz_id": "q1", "is_correct": True,  "attempt_count": 1}},
        {"timestamp": "2025-01-01T10:45:00+00:00", "event_type": "QUIZ_RESULT",
         "data": {"quiz_id": "q2", "is_correct": False, "attempt_count": 3}},
    ]


def test_analyzer():
    print("\n=== test_analyzer ===")
    logs = _make_logs()
    m = analyze_session("2025-01-01T09:55:00+00:00", logs)
    print(f"  total_seconds      : {m.total_seconds}")
    print(f"  focused_seconds    : {m.focused_seconds}")
    print(f"  distracted_seconds : {m.distracted_seconds}")
    print(f"  focus_ratio        : {m.focus_ratio}")
    print(f"  harness_error_count: {m.harness_error_count}")
    print(f"  paste_ratio        : {m.paste_ratio}")
    print(f"  autonomy_score     : {m.autonomy_score}")
    print(f"  wing_categories    : {m.wing_request_categories}")
    print(f"  quiz_correct/total : {m.quiz_correct}/{m.quiz_total}")

    assert m.distracted_seconds == 600.0, f"expected 600.0, got {m.distracted_seconds}"
    assert m.harness_error_count == 5
    assert m.paste_count == 3
    assert m.quiz_total == 2 and m.quiz_correct == 1
    print("  OK")


def test_scorer():
    print("\n=== test_scorer ===")
    logs = _make_logs()
    metrics = analyze_session("2025-01-01T09:55:00+00:00", logs)
    scores = calculate_session_aptitude(metrics)
    print(f"  session_aptitude: {scores}")
    for v in scores.values():
        assert 0 <= v <= 100, f"점수 범위 초과: {v}"
    print("  OK")


def test_profile_update():
    print("\n=== test_profile_update ===")
    current = {"logic_avg": 40.0, "planning_avg": 30.0, "ux_avg": 20.0, "data_avg": 10.0}
    new_scores = {"logic_score": 60.0, "planning_score": 50.0, "ux_score": 40.0, "data_score": 20.0}
    updated = update_profile_averages(current, session_count=4, new_scores=new_scores)
    print(f"  updated: {updated}")
    # 5회 누적 평균: (이전 4회×40 + 60) / 5 = 44
    assert updated["logic_avg"] == 44.0, f"expected 44.0, got {updated['logic_avg']}"
    print("  OK")


def test_career_identity():
    print("\n=== test_career_identity ===")

    # 5회 미만 → 태그 없음
    tags = assign_career_identity(4, {"logic_avg": 90, "planning_avg": 10, "ux_avg": 10, "data_avg": 10})
    assert tags == [], f"5회 미만인데 태그 부여됨: {tags}"

    # 5회, logic이 전체 평균의 1.5배 이상
    avg = {"logic_avg": 75.0, "planning_avg": 20.0, "ux_avg": 20.0, "data_avg": 20.0}
    overall = sum(avg.values()) / 4  # 33.75
    tags = assign_career_identity(5, avg)
    print(f"  overall_avg={overall:.2f}, threshold={overall*1.5:.2f}, tags={tags}")
    assert "#Logic" in tags, f"Logic 태그 없음: {tags}"

    # 최대 2개 제한
    avg2 = {"logic_avg": 80.0, "planning_avg": 80.0, "ux_avg": 80.0, "data_avg": 5.0}
    tags2 = assign_career_identity(5, avg2)
    assert len(tags2) <= 2, f"태그 2개 초과: {tags2}"
    print(f"  max 2 tags: {tags2}")
    print("  OK")


def test_redflag():
    print("\n=== test_redflag ===")

    # 3회 연속 집중도·참여도 하락 → HIGH
    snapshots = [
        SessionSnapshot("s1", focus_ratio=0.80, harness_error_count=8,  focused_seconds=2400),
        SessionSnapshot("s2", focus_ratio=0.60, harness_error_count=5,  focused_seconds=1800),
        SessionSnapshot("s3", focus_ratio=0.40, harness_error_count=2,  focused_seconds=1200),
    ]
    result = detect_redflag(snapshots)
    print(f"  result: {result}")
    assert result is not None
    assert result["severity"] == "HIGH"

    # 2회만 → None
    result2 = detect_redflag(snapshots[:2])
    assert result2 is None

    # 집중도만 하락, 참여도 유지 → MID
    snapshots3 = [
        SessionSnapshot("s1", focus_ratio=0.80, harness_error_count=3, focused_seconds=2400),
        SessionSnapshot("s2", focus_ratio=0.60, harness_error_count=4, focused_seconds=1800),
        SessionSnapshot("s3", focus_ratio=0.40, harness_error_count=5, focused_seconds=1200),
    ]
    result3 = detect_redflag(snapshots3)
    print(f"  MID result: {result3}")
    assert result3 is not None
    assert result3["severity"] == "MID"
    print("  OK")


if __name__ == "__main__":
    test_analyzer()
    test_scorer()
    test_profile_update()
    test_career_identity()
    test_redflag()
    print("\n✅ 모든 테스트 통과")
