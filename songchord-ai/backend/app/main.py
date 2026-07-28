from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import export, songs
from app.config import get_settings
from app.database import Base, engine

settings = get_settings()

Base.metadata.create_all(bind=engine)

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
