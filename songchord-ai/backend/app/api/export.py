from enum import Enum

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.domain import AnalysisData, Chord, LyricLine
from app.models import AnalysisResult, Song, SongPhase
from app.services.exporters import export_chordpro, export_json, export_txt

router = APIRouter(prefix="/api/songs", tags=["export"])


class ExportFormat(str, Enum):
    txt = "txt"
    chordpro = "chordpro"
    json = "json"


_CONTENT_TYPES = {
    ExportFormat.txt: "text/plain; charset=utf-8",
    ExportFormat.chordpro: "text/plain; charset=utf-8",
    ExportFormat.json: "application/json",
}
_EXTENSIONS = {
    ExportFormat.txt: "txt",
    ExportFormat.chordpro: "cho",
    ExportFormat.json: "json",
}


@router.get("/{song_id}/export")
def export_song(song_id: str, format: ExportFormat, db: Session = Depends(get_db)) -> PlainTextResponse:
    song = db.get(Song, song_id)
    if song is None:
        raise HTTPException(status_code=404, detail="Canción no encontrada.")
    if song.phase != SongPhase.DONE:
        raise HTTPException(status_code=409, detail="El análisis todavía no ha terminado.")

    result = db.query(AnalysisResult).filter_by(song_id=song.id).one_or_none()
    analysis = AnalysisData(
        title=song.title,
        duration=song.duration,
        key=result.key if result else None,
        tempo=result.tempo if result else None,
        capo=result.capo if result else 0,
        transpose_semitones=result.transpose_semitones if result else 0,
        lyrics=[LyricLine(**line) for line in (result.lyrics if result else [])],
        chords=[Chord(**chord) for chord in (result.chords if result else [])],
        edited=result.edited if result else False,
    )

    if format == ExportFormat.txt:
        content = export_txt(analysis)
    elif format == ExportFormat.chordpro:
        content = export_chordpro(analysis)
    else:
        content = export_json(analysis)

    filename = f"{song.title or 'song'}.{_EXTENSIONS[format]}"
    return PlainTextResponse(
        content,
        media_type=_CONTENT_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
