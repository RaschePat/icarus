from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import lesson, activity, user, insight, alert
from routers import auth, courses, platform


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="ICARUS API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/v1"

app.include_router(lesson.router,   prefix=API_PREFIX)
app.include_router(activity.router, prefix=API_PREFIX)
app.include_router(user.router,     prefix=API_PREFIX)
app.include_router(insight.router,  prefix=API_PREFIX)
app.include_router(alert.router,    prefix=API_PREFIX)
app.include_router(auth.router,     prefix=API_PREFIX)
app.include_router(courses.router,  prefix=API_PREFIX)
app.include_router(platform.router, prefix=API_PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok"}
