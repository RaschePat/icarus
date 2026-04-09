"""
engine.py — Insight 전체 분석 파이프라인

호출 순서:
  1. activity_log 로드
  2. BehaviorMetrics 계산 (analyzer)
  3. session_aptitude 점수 산출 (scorer)
  4. ActivityLog.session_aptitude DB 업데이트
  5. UserProfile 누적 평균 업데이트 (scorer)
  6. career_identity 태그 재평가 (career)
  7. RED_FLAG 감지 → Slack 전송 (redflag)
  8. AnalysisReport 반환
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import ActivityLog, UserProfile
from insight.analyzer import analyze_session, analyze_interests, BehaviorMetrics
from insight.scorer import calculate_session_aptitude, update_profile_averages
from insight.career import build_career_summary
from insight.redflag import SessionSnapshot, detect_redflag, send_redflag_alert


# ── 반환 타입 ──────────────────────────────────────────────────────────────

@dataclass
class AnalysisReport:
    session_id: str
    user_id: str
    metrics: BehaviorMetrics
    session_aptitude: dict[str, float]
    updated_profile: dict[str, float]   # 누적 평균
    career_summary: dict
    redflag: dict | None                # None이면 감지 안 됨
    radar_data: list[dict] = field(default_factory=list)
    ai_comment: str = ""


# ── 파이프라인 ─────────────────────────────────────────────────────────────

async def run_analysis(
    session_id: str,
    db: AsyncSession,
) -> AnalysisReport:
    """
    session_id 기준으로 분석 파이프라인 전체를 실행합니다.
    activity_log, user_profile 테이블을 읽고 업데이트합니다.
    """
    # ── 1. activity_log 로드 ──────────────────────────────────────────────
    result = await db.execute(
        select(ActivityLog).where(ActivityLog.session_id == session_id)
    )
    log_row = result.scalar_one_or_none()
    if log_row is None:
        raise ValueError(f"session_id '{session_id}' 를 찾을 수 없습니다.")

    user_id = log_row.user_id

    # ── 2. BehaviorMetrics 계산 ───────────────────────────────────────────
    metrics = analyze_session(
        timestamp_start=log_row.timestamp_start.isoformat(),
        logs=log_row.logs,
    )

    # ── 3. session_aptitude 점수 산출 ─────────────────────────────────────
    aptitude = calculate_session_aptitude(metrics)

    # ── 4. ActivityLog.session_aptitude DB 업데이트 ───────────────────────
    log_row.session_aptitude = aptitude
    await db.flush()

    # ── 5. UserProfile 로드 or 생성 ───────────────────────────────────────
    profile = await db.get(UserProfile, user_id)
    if profile is None:
        profile = UserProfile(
            user_id=user_id,
            logic_avg=0.0, planning_avg=0.0, ux_avg=0.0, data_avg=0.0,
            session_count=0,
            career_identity=[],
            interest_profile={},
            last_updated=datetime.now(timezone.utc),
        )
        db.add(profile)
        await db.flush()

    current_avg = {
        "logic_avg":    profile.logic_avg,
        "planning_avg": profile.planning_avg,
        "ux_avg":       profile.ux_avg,
        "data_avg":     profile.data_avg,
    }

    # ── 6. 누적 평균 업데이트 ─────────────────────────────────────────────
    updated_avg = update_profile_averages(current_avg, profile.session_count, aptitude)
    profile.logic_avg    = updated_avg["logic_avg"]
    profile.planning_avg = updated_avg["planning_avg"]
    profile.ux_avg       = updated_avg["ux_avg"]
    profile.data_avg     = updated_avg["data_avg"]
    profile.session_count += 1
    profile.last_updated  = datetime.now(timezone.utc)

    # ── 6.5. 관심사 분석 및 interest_profile 업데이트 ─────────────────────
    prompt_summaries = [
        e.get("data", {}).get("prompt_summary", "")
        for e in log_row.logs
        if e.get("event_type") == "WING_REQUEST"
        and e.get("data", {}).get("prompt_summary")
    ]
    if prompt_summaries:
        interest = await analyze_interests(prompt_summaries)
        profile.interest_profile = _update_interest_profile(
            current=profile.interest_profile or {},
            new_category=interest["category"],
            new_keywords=interest["keywords"],
        )

    # ── 7. career_identity 태그 재평가 ────────────────────────────────────
    career_summary = build_career_summary(
        session_count=profile.session_count,
        cumulative_avg=updated_avg,
        current_tags=list(profile.career_identity or []),
    )
    profile.career_identity = career_summary["career_identity"]

    # ── 8. RED_FLAG 감지 ──────────────────────────────────────────────────
    # 해당 유저의 최근 세션 3개 로드 (시간 오름차순)
    recent_result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user_id)
        .order_by(ActivityLog.timestamp_start.asc())
        .limit(5)
    )
    recent_logs = recent_result.scalars().all()

    snapshots = [
        SessionSnapshot(
            session_id=r.session_id,
            focus_ratio=_get_focus_ratio(r.logs, r.timestamp_start.isoformat()),
            harness_error_count=_count_errors(r.logs),
            focused_seconds=_get_focused_seconds(r.logs, r.timestamp_start.isoformat()),
        )
        for r in recent_logs
    ]

    redflag_result = detect_redflag(snapshots)

    if redflag_result:
        await send_redflag_alert(
            user_id=user_id,
            severity=redflag_result["severity"],
            reason=redflag_result["reason"],
        )

    await db.commit()

    # ── 9. 레이더 데이터 구성 ─────────────────────────────────────────────
    radar_data = [
        {"subject": "Logic",    "score": round(updated_avg["logic_avg"],    1)},
        {"subject": "Planning", "score": round(updated_avg["planning_avg"], 1)},
        {"subject": "UX",       "score": round(updated_avg["ux_avg"],       1)},
        {"subject": "Data",     "score": round(updated_avg["data_avg"],     1)},
    ]

    ai_comment = _build_ai_comment(metrics, career_summary, redflag_result)

    return AnalysisReport(
        session_id=session_id,
        user_id=user_id,
        metrics=metrics,
        session_aptitude=aptitude,
        updated_profile=updated_avg,
        career_summary=career_summary,
        redflag=redflag_result,
        radar_data=radar_data,
        ai_comment=ai_comment,
    )


# ── 내부 헬퍼 ─────────────────────────────────────────────────────────────

def _update_interest_profile(
    current: dict,
    new_category: str,
    new_keywords: list[str],
) -> dict:
    """
    기존 interest_profile에 새 세션 관심사를 누적합니다.

    - category_counts: 카테고리별 등장 횟수
    - top_category: 가장 많이 등장한 카테고리
    - keyword_freq: 키워드별 등장 횟수
    - top_keywords: 빈도 상위 5개 키워드
    """
    category_counts: dict[str, int] = dict(current.get("category_counts", {}))
    category_counts[new_category] = category_counts.get(new_category, 0) + 1
    top_category = max(category_counts, key=lambda k: category_counts[k])

    keyword_freq: dict[str, int] = dict(current.get("keyword_freq", {}))
    for kw in new_keywords:
        keyword_freq[kw] = keyword_freq.get(kw, 0) + 1
    top_keywords = sorted(keyword_freq, key=lambda k: keyword_freq[k], reverse=True)[:5]

    return {
        "category_counts": category_counts,
        "top_category": top_category,
        "keyword_freq": keyword_freq,
        "top_keywords": top_keywords,
    }


def _count_errors(logs: list[dict]) -> int:
    return sum(
        e.get("data", {}).get("error_count", 1)
        for e in logs
        if e.get("event_type") == "HARNESS_ERROR"
    )


def _get_focus_ratio(logs: list[dict], timestamp_start: str) -> float:
    from insight.analyzer import analyze_session
    m = analyze_session(timestamp_start, logs)
    return m.focus_ratio


def _get_focused_seconds(logs: list[dict], timestamp_start: str) -> float:
    from insight.analyzer import analyze_session
    m = analyze_session(timestamp_start, logs)
    return m.focused_seconds


def _build_ai_comment(
    metrics: BehaviorMetrics,
    career_summary: dict,
    redflag: dict | None,
) -> str:
    """Insight 리포트용 텍스트 코멘트 생성."""
    parts: list[str] = []

    # 집중도 코멘트
    focus_pct = round(metrics.focus_ratio * 100, 1)
    if focus_pct >= 80:
        parts.append(f"집중도 {focus_pct}%로 매우 우수한 세션이었습니다.")
    elif focus_pct >= 50:
        parts.append(f"집중도 {focus_pct}%로 양호한 편입니다.")
    else:
        parts.append(f"집중도 {focus_pct}%로 이탈 시간이 많았습니다. 환경 점검을 권장합니다.")

    # 자립도 코멘트
    autonomy_pct = round(metrics.autonomy_score * 100, 1)
    if autonomy_pct >= 80:
        parts.append(f"자립도 {autonomy_pct}%로 스스로 코드를 작성하는 비율이 높습니다.")
    elif metrics.paste_ratio > 0.5:
        parts.append(f"붙여넣기 비율이 {round(metrics.paste_ratio*100,1)}%입니다. 직접 작성 훈련이 필요합니다.")

    # career_identity
    tags = career_summary.get("career_identity", [])
    if tags:
        parts.append(f"적성 태그 {' '.join(tags)} 가 부여되었습니다.")
    elif not career_summary.get("eligible"):
        remaining = 5 - career_summary.get("session_count", 0)
        parts.append(f"적성 태그 부여까지 {remaining}회 세션이 더 필요합니다.")

    # RED_FLAG
    if redflag:
        parts.append(f"⚠️ RED_FLAG ({redflag['severity']}): {redflag['cause']} 원인으로 멘토 알림이 발송되었습니다.")

    return " ".join(parts)
