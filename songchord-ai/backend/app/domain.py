"""Plain data models with no DB/settings dependency, so pure business logic
(smoothing, sync, transpose, export) can be unit tested in isolation."""

from pydantic import BaseModel, Field


class Word(BaseModel):
    text: str
    start: float
    end: float


class LyricLine(BaseModel):
    text: str
    start: float
    end: float
    words: list[Word] = Field(default_factory=list)


class Chord(BaseModel):
    name: str
    start: float
    end: float
    confidence: float = Field(ge=0.0, le=1.0)


class AnalysisData(BaseModel):
    title: str = ""
    duration: float | None = None
    key: str | None = None
    tempo: float | None = None
    capo: int = 0
    transpose_semitones: int = 0
    lyrics: list[LyricLine] = Field(default_factory=list)
    chords: list[Chord] = Field(default_factory=list)
    edited: bool = False
