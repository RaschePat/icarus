from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Union

from database import get_db
from models import ActivityLog
from schemas import ActivityLogRequest, ActivityEventRequest, ActivityLogResponse

router = APIRouter(prefix="/activity", tags=["activity"])


@router.post("/log", response_model=ActivityLogResponse)
async def post_activity_log(
    body: Union[ActivityLogRequest, ActivityEventRequest],
    db: AsyncSession = Depends(get_db)
):
    """
    두 가지 형식의 활동 로그를 받습니다:
    1. ActivityLogRequest: 세션 전체 로그 (legacy)
    2. ActivityEventRequest: 개별 이벤트 (Wing Extension)
    """
    if isinstance(body, ActivityLogRequest):
        # 기존 형식: 세션 전체 로그
        row = ActivityLog(
            session_id=body.session_id,
            user_id=body.user_id,
            timestamp_start=body.timestamp_start,
            logs=body.logs,
            session_aptitude=body.session_aptitude.model_dump(),
        )
    else:
        # 새로운 형식: 개별 이벤트 (event_type 기반)
        row = ActivityLog(
            session_id=body.session_id,
            user_id=body.user_id,
            timestamp_start=body.timestamp,
            logs=[{"event_type": body.event_type, "data": body.data}],
            session_aptitude={},
        )

    db.add(row)
    await db.commit()
    return ActivityLogResponse(status="received")
