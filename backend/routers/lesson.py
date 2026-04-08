from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import LessonContext
from schemas import LessonSyncRequest, LessonSyncResponse

router = APIRouter(prefix="/lesson", tags=["lesson"])


@router.post("/sync", response_model=LessonSyncResponse)
async def sync_lesson(body: LessonSyncRequest, db: AsyncSession = Depends(get_db)):
    row = LessonContext(
        lesson_id=body.lesson_id,
        topic=body.metadata.topic,
        instructor_id=body.metadata.instructor_id,
        instructor_style=body.metadata.instructor_style.model_dump(),
        knowledge_base=body.knowledge_base.model_dump(),
        harness_config=body.harness_config.model_dump(),
    )
    # upsert: 동일 lesson_id가 있으면 덮어씀
    existing = await db.get(LessonContext, body.lesson_id)
    if existing:
        existing.topic = row.topic
        existing.instructor_id = row.instructor_id
        existing.instructor_style = row.instructor_style
        existing.knowledge_base = row.knowledge_base
        existing.harness_config = row.harness_config
    else:
        db.add(row)
    await db.commit()
    return LessonSyncResponse(status="synced", lesson_id=body.lesson_id)


@router.get("/{lesson_id}")
async def get_lesson(lesson_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.get(LessonContext, lesson_id)
    if not row:
        raise HTTPException(status_code=404, detail="lesson not found")
    return {
        "lesson_id": row.lesson_id,
        "metadata": {
            "topic": row.topic,
            "instructor_id": row.instructor_id,
            "timestamp": row.created_at.isoformat(),
            "instructor_style": row.instructor_style,
        },
        "knowledge_base": row.knowledge_base,
        "harness_config": row.harness_config,
    }
