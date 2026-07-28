from pydantic import BaseModel, Field

from app.domain import Chord, LyricLine, Word
from app.models import SongPhase

__all__ = ["Word", "LyricLine", "Chord", "ResultOut", "SongOut", "SongEditIn"]


class ResultOut(BaseModel):
    key: str | None = None
    tempo: float | None = None
    capo: int = 0
    transpose_semitones: int = 0
    lyrics: list[LyricLine] = Field(default_factory=list)
    chords: list[Chord] = Field(default_factory=list)
    edited: bool = False

    model_config = {"from_attributes": True}


class SongOut(BaseModel):
    id: str
    title: str
    original_filename: str
    phase: SongPhase
    error_message: str | None = None
    duration: float | None = None
    result: ResultOut | None = None

    model_config = {"from_attributes": True}


class SongEditIn(BaseModel):
    lyrics: list[LyricLine] | None = None
    chords: list[Chord] | None = None
    capo: int | None = None
    transpose_semitones: int | None = None
