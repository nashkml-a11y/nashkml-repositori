from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import export, songs
from app.config import get_settings

settings = get_settings()

# Schema is managed by Alembic migrations (see backend/migrations/), applied
# via `alembic upgrade head` before this process starts (see Dockerfile /
# README) -- not created here, so the DB schema always matches a committed
# migration instead of silently drifting from the ORM models.
app = FastAPI(title="SongChord AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(songs.router)
app.include_router(export.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
