from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

db_url = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://", 1
)
engine = create_async_engine(db_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


# 기존 테이블에 누락된 컬럼을 추가하는 ALTER TABLE 목록
# (테이블이 이미 존재하지만 컬럼이 없는 경우를 안전하게 처리)
_MIGRATIONS = [
    # courses 테이블: instructor_id 컬럼 (platform 통합 시 추가됨)
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_id VARCHAR REFERENCES user_roles(user_id)",
    # courses 테이블: created_at 컬럼
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()",
    # lessons 테이블: 섹션 메타데이터 컬럼 (기존 lessons 테이블이 있을 경우 대비)
    "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id)",
    "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS section_title VARCHAR DEFAULT ''",
    "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS section_order INTEGER DEFAULT 0",
]


async def init_db():
    async with engine.begin() as conn:
        # 1. 모든 모델 기반 테이블 생성 (CREATE TABLE IF NOT EXISTS)
        #    신규 테이블: user_roles, course_instructors, units,
        #                 mentor_students, micro_projects, platform_notifications
        await conn.run_sync(Base.metadata.create_all)

        # 2. 기존 테이블 컬럼 마이그레이션
        #    courses 테이블이 instructor_id 없이 먼저 생성된 경우 대비
        for stmt in _MIGRATIONS:
            try:
                await conn.execute(text(stmt))
            except Exception:
                # 외래키 대상 테이블이 없는 등 예외는 무시 (다음 재시작 시 재시도)
                pass
