import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class SongPhase(str, enum.Enum):
    UPLOADED = "uploaded"
    VALIDATING = "validating"
    CONVERTING = "converting"
    SEPARATING = "separating"
    TRANSCRIBING = "transcribing"
    DETECTING_CHORDS = "detecting_chords"
    SMOOTHING = "smoothing"
    SYNCING = "syncing"
    DONE = "done"
    ERROR = "error"


class Song(Base):
    __tablename__ = "songs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255))
    original_filename: Mapped[str] = mapped_column(String(255))
    storage_path: Mapped[str] = mapped_column(String(1024))
    phase: Mapped[SongPhase] = mapped_column(
        Enum(SongPhase, native_enum=False), default=SongPhase.UPLOADED
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    result: Mapped["AnalysisResult | None"] = relationship(
        back_populates="song", uselist=False, cascade="all, delete-orphan"
    )


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    song_id: Mapped[str] = mapped_column(ForeignKey("songs.id"), unique=True)
    key: Mapped[str | None] = mapped_column(String(8), nullable=True)
    tempo: Mapped[float | None] = mapped_column(Float, nullable=True)
    capo: Mapped[int] = mapped_column(default=0)
    transpose_semitones: Mapped[int] = mapped_column(default=0)
    lyrics: Mapped[list] = mapped_column(JSON, default=list)
    chords: Mapped[list] = mapped_column(JSON, default=list)
    edited: Mapped[bool] = mapped_column(default=False)

    song: Mapped["Song"] = relationship(back_populates="result")
