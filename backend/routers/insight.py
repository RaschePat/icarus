from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import ActivityLog
from schemas import InsightReportResponse
from insight.engine import run_analysis

router = APIRouter(prefix="/insight", tags=["insight"])


@router.post("/analyze/{session_id}")
async def analyze_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """
    Insight 분석 파이프라인 전체 실행:
      1. BehaviorMetrics 계산
      2. session_aptitude 점수 산출 및 DB 저장
      3. user_profile 누적 평균 업데이트
      4. career_identity 태그 재평가
      5. RED_FLAG 감지 → Slack 알림
    """
    try:
        report = await run_analysis(session_id=session_id, db=db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "session_id": report.session_id,
        "user_id": report.user_id,
        "metrics": {
            "total_seconds":       report.metrics.total_seconds,
            "focused_seconds":     report.metrics.focused_seconds,
            "distracted_seconds":  report.metrics.distracted_seconds,
            "focus_ratio":         report.metrics.focus_ratio,
            "harness_error_count": report.metrics.harness_error_count,
            "paste_ratio":         report.metrics.paste_ratio,
            "autonomy_score":      report.metrics.autonomy_score,
        },
        "session_aptitude":  report.session_aptitude,
        "updated_profile":   report.updated_profile,
        "career_summary":    report.career_summary,
        "redflag":           report.redflag,
        "radar_data":        report.radar_data,
        "ai_comment":        report.ai_comment,
    }


@router.get("/report/{session_id}", response_model=InsightReportResponse)
async def get_insight_report(session_id: str, db: AsyncSession = Depends(get_db)):
    """
    분석이 완료된 세션의 레이더 데이터와 AI 코멘트를 반환합니다.
    분석이 아직 실행되지 않았다면 POST /insight/analyze/{session_id} 먼저 호출하세요.
    """
    result = await db.execute(
        select(ActivityLog).where(ActivityLog.session_id == session_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="session not found")

    aptitude = row.session_aptitude or {}
    radar_data = [
        {"subject": "Logic",    "score": aptitude.get("logic_score",    0)},
        {"subject": "Planning", "score": aptitude.get("planning_score", 0)},
        {"subject": "UX",       "score": aptitude.get("ux_score",       0)},
        {"subject": "Data",     "score": aptitude.get("data_score",     0)},
    ]
    return InsightReportResponse(radar_data=radar_data, ai_comment="")
