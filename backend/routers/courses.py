"""
courses.py — 과정(Course) / 단원(Unit) CRUD
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Course, Unit

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


# ── 과정 엔드포인트 ───────────────────────────────────────────────────────

@router.get("", response_model=list[CourseResponse])
async def list_courses(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Course).order_by(Course.id))).scalars().all()
    return rows


@router.post("", response_model=CourseResponse, status_code=201)
async def create_course(body: CourseCreate, db: AsyncSession = Depends(get_db)):
    row = Course(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


# ── 단원 엔드포인트 ───────────────────────────────────────────────────────

@router.get("/{course_id}/units", response_model=list[UnitResponse])
async def list_units(course_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Unit).where(Unit.course_id == course_id).order_by(Unit.order_index)
    rows = (await db.execute(stmt)).scalars().all()
    return rows


@router.post("/{course_id}/units", response_model=UnitResponse, status_code=201)
async def create_unit(course_id: int, body: UnitCreate, db: AsyncSession = Depends(get_db)):
    # 과정 존재 확인
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="과정을 찾을 수 없습니다.")
    row = Unit(course_id=course_id, **body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row
