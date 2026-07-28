import os
import uuid

import mimetypes

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.models import AnalysisResult, Song, SongPhase
from app.schemas import SongEditIn, SongOut
from app.services.validation import UploadValidationError, validate_upload

router = APIRouter(prefix="/api/songs", tags=["songs"])


def _get_song_or_404(db: Session, song_id: str) -> Song:
    song = db.get(Song, song_id)
    if song is None:
        raise HTTPException(status_code=404, detail="Canción no encontrada.")
    return song


@router.post("", response_model=SongOut, status_code=201)
async def upload_song(
    file: UploadFile,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Song:
    contents = await file.read()
    try:
        validate_upload(file.filename or "", file.content_type, len(contents), settings)
    except UploadValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    song_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower()
    song_dir = os.path.join(settings.storage_dir, song_id)
    os.makedirs(song_dir, exist_ok=True)
    storage_path = os.path.join(song_dir, f"original{ext}")
    with open(storage_path, "wb") as f:
        f.write(contents)

    title = os.path.splitext(file.filename)[0]
    song = Song(
        id=song_id,
        title=title,
        original_filename=file.filename,
        storage_path=storage_path,
        phase=SongPhase.UPLOADED,
    )
    db.add(song)
    db.commit()
    db.refresh(song)
    return song


@router.post("/{song_id}/analyze", response_model=SongOut)
def analyze_song(song_id: str, db: Session = Depends(get_db)) -> Song:
    from app.tasks.pipeline import analyze_song_task

    song = _get_song_or_404(db, song_id)
    if song.phase not in (SongPhase.UPLOADED, SongPhase.ERROR, SongPhase.DONE):
        raise HTTPException(status_code=409, detail="El análisis ya está en curso.")

    song.phase = SongPhase.VALIDATING
    song.error_message = None
    db.add(song)
    db.commit()
    db.refresh(song)

    analyze_song_task.delay(song_id)
    return song


@router.get("/{song_id}", response_model=SongOut)
def get_song(song_id: str, db: Session = Depends(get_db)) -> Song:
    return _get_song_or_404(db, song_id)


@router.get("/{song_id}/audio")
def get_song_audio(song_id: str, db: Session = Depends(get_db)) -> FileResponse:
    song = _get_song_or_404(db, song_id)
    if not os.path.exists(song.storage_path):
        raise HTTPException(status_code=404, detail="El archivo de audio ya no está disponible.")
    media_type = mimetypes.guess_type(song.storage_path)[0] or "application/octet-stream"
    return FileResponse(song.storage_path, media_type=media_type)


@router.put("/{song_id}", response_model=SongOut)
def update_song(song_id: str, edits: SongEditIn, db: Session = Depends(get_db)) -> Song:
    song = _get_song_or_404(db, song_id)
    result = db.query(AnalysisResult).filter_by(song_id=song.id).one_or_none()
    if result is None:
        result = AnalysisResult(song_id=song.id)

    if edits.lyrics is not None:
        result.lyrics = [line.model_dump() for line in edits.lyrics]
    if edits.chords is not None:
        result.chords = [chord.model_dump() for chord in edits.chords]
    if edits.capo is not None:
        result.capo = edits.capo
    if edits.transpose_semitones is not None:
        result.transpose_semitones = edits.transpose_semitones
    result.edited = True

    db.add(result)
    db.commit()
    db.refresh(song)
    return song
