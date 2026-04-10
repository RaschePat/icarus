"""
courses.py — 과정(Course) / 단원(Unit) CRUD + 강사 배정
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from database import get_db
from models import Course, Unit, CourseInstructor, UserRole
from deps import get_current_user

router = APIRouter(prefix="/courses", tags=["courses"])


# ── 스키마 ────────────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    title: str
    description: str = ""
    duration_months: int = 1


class CourseResponse(BaseModel):
    id: int
    title: str
    description: str
    duration_months: int
    instructor_id: str | None = None

    class Config:
        from_attributes = True


class UnitCreate(BaseModel):
    title: str
    order_index: int = 0


class UnitResponse(BaseModel):
    id: int
    course_id: int
    title: str
    order_index: int

    class Config:
        from_attributes = True


class AssignInstructorRequest(BaseModel):
    instructor_id: str


# ── 과정 엔드포인트 ───────────────────────────────────────────────────────

@router.get("", response_model=list[CourseResponse])
async def list_courses(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Course).order_by(Course.id))).scalars().all()
    return rows


# NOTE: /my 는 /{course_id}/... 패턴보다 반드시 앞에 정의해야 합니다.
@router.get("/my", response_model=list[CourseResponse])
async def get_my_courses(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """강사 본인이 배정된 과정 목록 조회 (JWT에서 user_id 추출)."""
    instructor_id = current_user["user_id"]
    stmt = (
        select(Course)
        .join(CourseInstructor, CourseInstructor.course_id == Course.id)
        .where(CourseInstructor.instructor_id == instructor_id)
        .order_by(Course.id)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return rows


@router.post("", response_model=CourseResponse, status_code=201)
async def create_course(body: CourseCreate, db: AsyncSession = Depends(get_db)):
    row = Course(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


# ── 강사 배정 엔드포인트 ──────────────────────────────────────────────────

@router.post("/{course_id}/assign-instructor", status_code=201)
async def assign_instructor(
    course_id: int,
    body: AssignInstructorRequest,
    db: AsyncSession = Depends(get_db),
):
    """운영자가 과정에 강사를 배정합니다."""
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="과정을 찾을 수 없습니다.")

    # 강사 존재 확인
    stmt = select(UserRole).where(
        UserRole.user_id == body.instructor_id,
        UserRole.role == "instructor",
    )
    instructor = (await db.execute(stmt)).scalar_one_or_none()
    if not instructor:
        raise HTTPException(status_code=404, detail="강사를 찾을 수 없습니다.")

    # 중복 배정 방지
    dup_stmt = select(CourseInstructor).where(
        CourseInstructor.course_id == course_id,
        CourseInstructor.instructor_id == body.instructor_id,
    )
    if (await db.execute(dup_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 배정된 강사입니다.")

    row = CourseInstructor(course_id=course_id, instructor_id=body.instructor_id)
    db.add(row)
    course.instructor_id = body.instructor_id  # 대표 강사 갱신
    await db.commit()

    return {"status": "assigned", "course_id": course_id, "instructor_id": body.instructor_id}


@router.delete("/{course_id}/instructors/{instructor_id}")
async def remove_instructor(
    course_id: int,
    instructor_id: str,
    db: AsyncSession = Depends(get_db),
):
    """강사 배정을 해제합니다."""
    stmt = select(CourseInstructor).where(
        CourseInstructor.course_id == course_id,
        CourseInstructor.instructor_id == instructor_id,
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="배정 정보를 찾을 수 없습니다.")

    await db.delete(row)

    # 해제한 강사가 대표 강사였으면 다른 강사로 교체 또는 null 처리
    course = await db.get(Course, course_id)
    if course and course.instructor_id == instructor_id:
        other_stmt = select(CourseInstructor).where(
            CourseInstructor.course_id == course_id,
            CourseInstructor.instructor_id != instructor_id,
        ).limit(1)
        other = (await db.execute(other_stmt)).scalar_one_or_none()
        course.instructor_id = other.instructor_id if other else None

    await db.commit()
    return {"status": "removed"}


# ── 단원 엔드포인트 ───────────────────────────────────────────────────────

@router.get("/{course_id}/units", response_model=list[UnitResponse])
async def list_units(course_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Unit).where(Unit.course_id == course_id).order_by(Unit.order_index)
    rows = (await db.execute(stmt)).scalars().all()
    return rows


@router.post("/{course_id}/units", response_model=UnitResponse, status_code=201)
async def create_unit(course_id: int, body: UnitCreate, db: AsyncSession = Depends(get_db)):
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="과정을 찾을 수 없습니다.")
    row = Unit(course_id=course_id, **body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row
