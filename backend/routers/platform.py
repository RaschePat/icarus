"""
platform.py — Wing 폴링, 마이크로 프로젝트, 알림, 멘토 관리
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from database import get_db
from models import (
    LessonContext, MicroProject, PlatformNotification,
    MentorStudent, UserRole, UserProfile, ActivityLog,
    Lesson, StudentLesson, StudentCourse, Course,
)
from deps import get_current_user

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
    return {**row.__dict__, "created_at": row.created_at.isoformat()}


@router.get("/micro-projects/{user_id}", response_model=list[MicroProjectResponse])
async def get_micro_projects(user_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(MicroProject).where(MicroProject.user_id == user_id).order_by(desc(MicroProject.created_at))
    rows = (await db.execute(stmt)).scalars().all()
    return [{**r.__dict__, "created_at": r.created_at.isoformat()} for r in rows]


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
    return [{**r.__dict__, "created_at": r.created_at.isoformat()} for r in rows]


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


# ── 역할별 유저 목록 (운영자 전용) ───────────────────────────────────────

@router.get("/users")
async def get_users_by_role(
    role: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    search: str | None = None,
):
    """역할별 유저 목록 조회.
    - admin: 모든 role 조회 가능
    - mentor: role=student 조회 + 이메일 검색 가능
    """
    caller_role = current_user["role"]
    if caller_role == "admin":
        pass
    elif caller_role == "mentor" and role == "student":
        pass
    else:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    stmt = select(UserRole).where(UserRole.role == role)
    if search:
        stmt = stmt.where(UserRole.email.ilike(f"%{search}%"))
    stmt = stmt.order_by(UserRole.name)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {"user_id": r.user_id, "name": r.name, "email": r.email, "role": r.role}
        for r in rows
    ]


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

    students = []
    for sid in student_ids:
        stmt2 = select(UserRole).where(UserRole.user_id == sid)
        user = (await db.execute(stmt2)).scalar_one_or_none()
        if not user:
            continue

        # UserProfile 조회 (없으면 None)
        profile = await db.get(UserProfile, sid)

        students.append({
            "user_id":          user.user_id,
            "name":             user.name,
            "email":            user.email,
            "role":             user.role,
            "session_count":    profile.session_count if profile else 0,
            "career_identity":  profile.career_identity if profile else [],
            "aptitude": {
                "logic_avg":    profile.logic_avg    if profile else 0.0,
                "planning_avg": profile.planning_avg if profile else 0.0,
                "ux_avg":       profile.ux_avg       if profile else 0.0,
                "data_avg":     profile.data_avg     if profile else 0.0,
            },
            "top_category": (
                (profile.interest_profile or {}).get("top_category")
                if profile else None
            ),
            "last_updated": profile.last_updated.isoformat() if profile and profile.last_updated else None,
        })
    return students


@router.get("/mentor/students/{student_id}/detail")
async def get_mentor_student_detail(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """멘토가 특정 학생 상세 조회 — user_profile, activity_logs 최근 5개, micro_projects, RED_FLAG 이력."""
    # 기본 정보
    stmt_user = select(UserRole).where(UserRole.user_id == student_id)
    user = (await db.execute(stmt_user)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")

    # UserProfile
    profile = await db.get(UserProfile, student_id)

    # 최근 활동 로그 5개
    stmt_logs = (
        select(ActivityLog)
        .where(ActivityLog.user_id == student_id)
        .order_by(desc(ActivityLog.timestamp_start))
        .limit(5)
    )
    logs = (await db.execute(stmt_logs)).scalars().all()
    recent_sessions = [
        {
            "session_id":       log.session_id,
            "timestamp_start":  log.timestamp_start.isoformat(),
            "session_aptitude": log.session_aptitude,
            # focus_ratio: session_aptitude에 포함되어 있으면 추출, 없으면 0
            "focus_ratio": (log.session_aptitude or {}).get("focus_ratio", 0),
        }
        for log in logs
    ]

    # 마이크로 프로젝트
    stmt_proj = (
        select(MicroProject)
        .where(MicroProject.user_id == student_id)
        .order_by(desc(MicroProject.created_at))
    )
    projects = (await db.execute(stmt_proj)).scalars().all()
    micro_projects = [
        {
            "id":                p.id,
            "user_id":           p.user_id,
            "session_id":        p.session_id,
            "name":              p.name,
            "template":          p.template,
            "interest_category": p.interest_category,
            "harness_total":     p.harness_total,
            "harness_filled":    p.harness_filled,
            "created_at":        p.created_at.isoformat(),
        }
        for p in projects
    ]

    # RED_FLAG 알림 이력
    stmt_rf = (
        select(PlatformNotification)
        .where(
            PlatformNotification.user_id == student_id,
            PlatformNotification.type == "RED_FLAG",
        )
        .order_by(desc(PlatformNotification.created_at))
        .limit(10)
    )
    red_flags = (await db.execute(stmt_rf)).scalars().all()
    red_flag_list = [
        {
            "id":         rf.id,
            "title":      rf.title,
            "message":    rf.message,
            "is_read":    rf.is_read,
            "created_at": rf.created_at.isoformat(),
        }
        for rf in red_flags
    ]

    return {
        "user_id": user.user_id,
        "name":    user.name,
        "email":   user.email,
        "profile": {
            "user_id": profile.user_id,
            "cumulative_aptitude": {
                "logic_avg":    profile.logic_avg,
                "planning_avg": profile.planning_avg,
                "ux_avg":       profile.ux_avg,
                "data_avg":     profile.data_avg,
            },
            "session_count":   profile.session_count,
            "career_identity": profile.career_identity,
            "interest_profile": profile.interest_profile,
            "last_updated":    profile.last_updated.isoformat(),
        } if profile else None,
        "recent_sessions": recent_sessions,
        "micro_projects":  micro_projects,
        "red_flags":       red_flag_list,
    }


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


# ── 학생 과정 등록 ──────────────────────────────────────────────────────

class StudentCourseEnroll(BaseModel):
    student_id: str
    course_id: int


@router.post("/student-courses", status_code=201)
async def enroll_course(body: StudentCourseEnroll, db: AsyncSession = Depends(get_db)):
    """학생을 과정에 등록합니다."""
    course = await db.get(Course, body.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="과정을 찾을 수 없습니다.")
    # 중복 등록 방지
    dup_stmt = select(StudentCourse).where(
        StudentCourse.student_id == body.student_id,
        StudentCourse.course_id == body.course_id,
    )
    if (await db.execute(dup_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 등록된 과정입니다.")
    row = StudentCourse(student_id=body.student_id, course_id=body.course_id)
    db.add(row)
    await db.commit()
    return {"status": "enrolled", "student_id": body.student_id, "course_id": body.course_id}


@router.get("/student-courses/{student_id}")
async def list_student_courses(student_id: str, db: AsyncSession = Depends(get_db)):
    """학생이 수강 중인 과정 목록."""
    stmt = (
        select(StudentCourse)
        .where(StudentCourse.student_id == student_id)
        .order_by(StudentCourse.enrolled_at)
    )
    rows = (await db.execute(stmt)).scalars().all()

    # 각 과정의 상세 정보 조회
    courses = []
    for sc in rows:
        course = await db.get(Course, sc.course_id)
        if course:
            courses.append({
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "duration_months": course.duration_months,
                "instructor_id": course.instructor_id,
                "enrolled_at": sc.enrolled_at.isoformat(),
            })
    return courses


# ── 수강 등록 ────────────────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    student_id: str


@router.post("/lessons/{lesson_id}/enroll", status_code=201)
async def enroll_student(lesson_id: str, body: EnrollRequest, db: AsyncSession = Depends(get_db)):
    """학생을 수업 섹션에 등록합니다."""
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="수업을 찾을 수 없습니다.")
    dup_stmt = select(StudentLesson).where(
        StudentLesson.lesson_id == lesson_id,
        StudentLesson.student_id == body.student_id,
    )
    if (await db.execute(dup_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 등록된 학생입니다.")
    row = StudentLesson(lesson_id=lesson_id, student_id=body.student_id)
    db.add(row)
    await db.commit()
    return {"status": "enrolled", "lesson_id": lesson_id, "student_id": body.student_id}


@router.get("/lessons/{lesson_id}/students")
async def list_lesson_students(lesson_id: str, db: AsyncSession = Depends(get_db)):
    """해당 수업의 수강생 목록."""
    stmt = select(StudentLesson).where(StudentLesson.lesson_id == lesson_id)
    rows = (await db.execute(stmt)).scalars().all()
    return [{"student_id": r.student_id, "enrolled_at": r.enrolled_at.isoformat()} for r in rows]


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
