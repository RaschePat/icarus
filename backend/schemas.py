from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


# --- lesson_context ---

class InstructorStyle(BaseModel):
    language: str
    naming_convention: str
    comment_style: str
    preferred_libraries: list[str]


class CoreConcept(BaseModel):
    id: str
    title: str
    summary: str


class KnowledgeBase(BaseModel):
    keywords: list[str]
    core_concepts: list[CoreConcept]


class TargetLogic(BaseModel):
    logic_id: str
    search_pattern: str
    code_snippet: str
    match_strategy: str = "first_occurrence"


class HarnessConfig(BaseModel):
    target_logic: list[TargetLogic]
    quiz_pool: list[Any] = []


class LessonMetadata(BaseModel):
    topic: str
    instructor_id: str
    timestamp: datetime
    instructor_style: InstructorStyle


class LessonSyncRequest(BaseModel):
    lesson_id: str
    metadata: LessonMetadata
    knowledge_base: KnowledgeBase
    harness_config: HarnessConfig


class LessonSyncResponse(BaseModel):
    status: str
    lesson_id: str


# --- activity_log ---

class SessionAptitude(BaseModel):
    logic_score: float = 0
    planning_score: float = 0
    ux_score: float = 0
    data_score: float = 0


class ActivityLogRequest(BaseModel):
    session_id: str
    user_id: str
    timestamp_start: datetime
    logs: list[dict[str, Any]]
    session_aptitude: SessionAptitude


class ActivityEventRequest(BaseModel):
    """Wing Extension에서 보내는 개별 이벤트 로그."""
    session_id: str
    user_id: str
    event_type: str  # WING_REQUEST, INPUT_TYPE, FOCUS_CHANGE
    data: dict[str, Any]
    timestamp: datetime


class ActivityLogResponse(BaseModel):
    status: str


# --- user_profile ---

class InterestProfile(BaseModel):
    """세션 누적 관심사 프로필."""
    category_counts: dict[str, int] = Field(default_factory=dict)
    top_category: str | None = None
    keyword_freq: dict[str, int] = Field(default_factory=dict)
    top_keywords: list[str] = Field(default_factory=list)


class CumulativeAptitude(BaseModel):
    logic_avg: float
    planning_avg: float
    ux_avg: float
    data_avg: float


class UserProfileResponse(BaseModel):
    user_id: str
    cumulative_aptitude: CumulativeAptitude
    session_count: int
    career_identity: list[str]
    interest_profile: InterestProfile = Field(default_factory=InterestProfile)
    last_updated: datetime


# --- insight report ---

class InsightReportResponse(BaseModel):
    radar_data: list[dict[str, Any]]
    ai_comment: str


# --- alert redflag ---

class RedFlagRequest(BaseModel):
    user_id: str
    reason: str
    severity: str  # "HIGH" | "MID"


class RedFlagResponse(BaseModel):
    status: str
