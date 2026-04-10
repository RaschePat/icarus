from datetime import datetime
from sqlalchemy import String, Float, Integer, JSON, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class LessonContext(Base):
    __tablename__ = "lesson_context"

    lesson_id: Mapped[str] = mapped_column(String, primary_key=True)
    topic: Mapped[str] = mapped_column(String, nullable=False)
    instructor_id: Mapped[str] = mapped_column(String, nullable=False)
    instructor_style: Mapped[dict] = mapped_column(JSON, nullable=False)
    knowledge_base: Mapped[dict] = mapped_column(JSON, nullable=False)
    harness_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    timestamp_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    logs: Mapped[list] = mapped_column(JSON, nullable=False)
    session_aptitude: Mapped[dict] = mapped_column(JSON, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class UserProfile(Base):
    __tablename__ = "user_profile"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    logic_avg: Mapped[float] = mapped_column(Float, default=0.0)
    planning_avg: Mapped[float] = mapped_column(Float, default=0.0)
    ux_avg: Mapped[float] = mapped_column(Float, default=0.0)
    data_avg: Mapped[float] = mapped_column(Float, default=0.0)
    session_count: Mapped[int] = mapped_column(Integer, default=0)
    career_identity: Mapped[list] = mapped_column(JSON, default=list)
    interest_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    last_updated: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


# ── 신규 테이블 (platform 통합) ───────────────────────────────────────────

class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, default="")
    duration_months: Mapped[int] = mapped_column(Integer, default=1)
    instructor_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("user_roles.user_id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class CourseInstructor(Base):
    """과정-강사 N:M 중간 테이블 (강사가 여러 과정 담당 가능)."""
    __tablename__ = "course_instructors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("courses.id"), nullable=False, index=True
    )
    instructor_id: Mapped[str] = mapped_column(
        String, ForeignKey("user_roles.user_id"), nullable=False, index=True
    )


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)


class UserRole(Base):
    __tablename__ = "user_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="student")  # student/instructor/admin/mentor
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class MentorStudent(Base):
    __tablename__ = "mentor_students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mentor_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String, nullable=False, index=True)


class MicroProject(Base):
    __tablename__ = "micro_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    template: Mapped[str] = mapped_column(String, nullable=False)  # java/python/node
    interest_category: Mapped[str] = mapped_column(String, default="기타")
    harness_total: Mapped[int] = mapped_column(Integer, default=0)
    harness_filled: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PlatformNotification(Base):
    __tablename__ = "platform_notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    type: Mapped[str] = mapped_column(String, nullable=False)  # RED_FLAG / INFO / QUIZ
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    is_read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Lesson(Base):
    """수업 섹션(수업일) — 과정 단원 내 개별 수업 슬롯."""
    __tablename__ = "lessons"

    lesson_id: Mapped[str] = mapped_column(String, primary_key=True)
    unit_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("units.id"), nullable=True, index=True
    )
    section_title: Mapped[str] = mapped_column(String, default="")
    section_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class StudentLesson(Base):
    """학생-수업 수강 등록 (N:M)."""
    __tablename__ = "student_lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    lesson_id: Mapped[str] = mapped_column(
        String, ForeignKey("lessons.lesson_id"), nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
