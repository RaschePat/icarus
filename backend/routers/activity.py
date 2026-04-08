from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import ActivityLog
from schemas import ActivityLogRequest, ActivityLogResponse

router = APIRouter(prefix="/activity", tags=["activity"])


@router.post("/log", response_model=ActivityLogResponse)
async def post_activity_log(body: ActivityLogRequest, db: AsyncSession = Depends(get_db)):
    row = ActivityLog(
        session_id=body.session_id,
        user_id=body.user_id,
        timestamp_start=body.timestamp_start,
        logs=body.logs,
        session_aptitude=body.session_aptitude.model_dump(),
    )
    db.add(row)
    await db.commit()
    return ActivityLogResponse(status="received")
