from datetime import datetime
from sqlalchemy import String, Float, Integer, JSON, DateTime, func
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
    last_updated: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
