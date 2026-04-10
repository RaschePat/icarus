"""
platform.py — Wing 폴링, 마이크로 프로젝트, 알림, 멘토 관리
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import LessonContext, MicroProject, PlatformNotification, MentorStudent, UserRole

router = APIRouter(tags=["platform"])


# ── Wing 폴링: 오늘 배포된 lesson_id ──────────────────────────────────────

@router.get("/today-lesson")
async def today_lesson(db: AsyncSession = Depends(get_db)):
    """가장 최근 배포된 lesson_id 반환 (Wing 30초 폴링용)."""
    stmt = select(LessonContext).order_by(desc(LessonContext.created_at)).limit(1)
    row = (await db.execute(stmt)).scalar_one_or_none()
    if not row:
        return {"lesson_id": None}
    return {"lesson_id": row.lesson_id}


# ── 마이크로 프로젝트 ─────────────────────────────────────────────────────

class MicroProjectCreate(BaseModel):
    user_id: str
    session_id: str
    name: str
    template: str
    interest_category: str = "기타"
    harness_total: int = 0
    harness_filled: int = 0


class MicroProjectResponse(BaseModel):
    id: int
    user_id: str
    session_id: str
    name: str
    template: str
    interest_category: str
    harness_total: int
    harness_filled: int
    created_at: str

    class Config:
        from_attributes = True


@router.post("/micro-projects", response_model=MicroProjectResponse, status_code=201)
async def create_micro_project(body: MicroProjectCreate, db: AsyncSession = Depends(get_db)):
    row = MicroProject(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {
        **row.__dict__,
        "created_at": row.created_at.isoformat(),
    }


@router.get("/micro-projects/{user_id}", response_model=list[MicroProjectResponse])
async def get_micro_projects(user_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(MicroProject).where(MicroProject.user_id == user_id).order_by(desc(MicroProject.created_at))
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {**r.__dict__, "created_at": r.created_at.isoformat()}
        for r in rows
    ]


# ── 알림 ─────────────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    user_id: str
    type: str
    title: str
    message: str


class NotificationResponse(BaseModel):
    id: int
    user_id: str
    type: str
    title: str
    message: str
    is_read: bool
    created_at: str


@router.get("/notifications/{user_id}", response_model=list[NotificationResponse])
async def get_notifications(user_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(PlatformNotification)
        .where(PlatformNotification.user_id == user_id)
        .order_by(desc(PlatformNotification.created_at))
        .limit(50)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {**r.__dict__, "created_at": r.created_at.isoformat()}
        for r in rows
    ]


@router.post("/notifications", response_model=NotificationResponse, status_code=201)
async def create_notification(body: NotificationCreate, db: AsyncSession = Depends(get_db)):
    row = PlatformNotification(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {**row.__dict__, "created_at": row.created_at.isoformat()}


@router.patch("/notifications/{notification_id}/read")
async def mark_read(notification_id: int, db: AsyncSession = Depends(get_db)):
    row = await db.get(PlatformNotification, notification_id)
    if not row:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
    row.is_read = True
    await db.commit()
    return {"status": "ok"}


# ── 멘토 학생 관리 ────────────────────────────────────────────────────────

class MentorStudentAdd(BaseModel):
    mentor_id: str
    student_id: str


@router.get("/mentor/students")
async def get_mentor_students(mentor_id: str, db: AsyncSession = Depends(get_db)):
    """mentor_id 쿼리 파라미터로 내 학생 목록 조회."""
    stmt = select(MentorStudent).where(MentorStudent.mentor_id == mentor_id)
    relations = (await db.execute(stmt)).scalars().all()
    student_ids = [r.student_id for r in relations]

    if not student_ids:
        return []

    # UserRole에서 학생 정보 조회
    students = []
    for sid in student_ids:
        stmt2 = select(UserRole).where(UserRole.user_id == sid)
        user = (await db.execute(stmt2)).scalar_one_or_none()
        if user:
            students.append({
                "user_id": user.user_id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            })
    return students


@router.post("/mentor/students", status_code=201)
async def add_mentor_student(body: MentorStudentAdd, db: AsyncSession = Depends(get_db)):
    row = MentorStudent(mentor_id=body.mentor_id, student_id=body.student_id)
    db.add(row)
    await db.commit()
    return {"status": "ok"}


@router.delete("/mentor/students/{student_id}")
async def remove_mentor_student(student_id: str, mentor_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(MentorStudent).where(
        MentorStudent.mentor_id == mentor_id,
        MentorStudent.student_id == student_id,
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="관계를 찾을 수 없습니다.")
    await db.delete(row)
    await db.commit()
    return {"status": "ok"}


# ── 퀴즈 활성화 (강사 트리거) ─────────────────────────────────────────────

@router.patch("/lesson/{lesson_id}/quiz-active")
async def activate_quiz(lesson_id: str, db: AsyncSession = Depends(get_db)):
    """퀴즈를 활성화합니다. Wing이 폴링으로 감지하여 퀴즈 패널을 표시합니다."""
    row = await db.get(LessonContext, lesson_id)
    if not row:
        raise HTTPException(status_code=404, detail="레슨을 찾을 수 없습니다.")
    config = row.harness_config or {}
    config["quiz_active"] = True
    row.harness_config = config
    await db.commit()
    return {"status": "quiz_activated", "lesson_id": lesson_id}
