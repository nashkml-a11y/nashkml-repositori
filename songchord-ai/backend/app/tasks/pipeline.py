"""The 9-phase analysis pipeline, run as a single Celery task per song.

validate -> convert -> separate -> transcribe -> detect chords -> smooth
-> unify -> sync -> persist. Any failure sets the song's phase to ERROR
with a message instead of raising, so the API can report it to the client.
Temporary per-job files are always removed, success or failure.
"""

import os
import shutil
import tempfile

from app.celery_app import celery_app
from app.config import get_settings
from app.database import SessionLocal
from app.domain import Chord
from app.models import AnalysisResult, Song, SongPhase
from app.services import chords as chords_service
from app.services import audio, separation, transcription
from app.services.smoothing import merge_consecutive_frames, smooth_chord_segments
from app.services.sync import sync_chords_to_words


def _set_phase(db, song: Song, phase: SongPhase, error: str | None = None) -> None:
    song.phase = phase
    song.error_message = error
    db.add(song)
    db.commit()


@celery_app.task(name="analyze_song", bind=True, max_retries=0)
def analyze_song_task(self, song_id: str) -> None:
    settings = get_settings()
    db = SessionLocal()
    workdir = tempfile.mkdtemp(prefix=f"songchord_{song_id}_")
    try:
        song = db.get(Song, song_id)
        if song is None:
            return

        _set_phase(db, song, SongPhase.VALIDATING)
        input_path = song.storage_path

        _set_phase(db, song, SongPhase.CONVERTING)
        wav_path = os.path.join(workdir, "input.wav")
        audio.convert_to_wav(input_path, wav_path)
        song.duration = audio.get_duration_seconds(wav_path)
        db.add(song)
        db.commit()

        _set_phase(db, song, SongPhase.SEPARATING)
        stems = separation.separate_stems(wav_path, os.path.join(workdir, "stems"))
        accompaniment_path = os.path.join(workdir, "accompaniment.wav")
        separation.build_accompaniment(stems, accompaniment_path)

        _set_phase(db, song, SongPhase.TRANSCRIBING)
        lyric_lines = transcription.transcribe_vocals(stems["vocals"], settings)

        _set_phase(db, song, SongPhase.DETECTING_CHORDS)
        key, tempo = chords_service.analyze_key_and_tempo(accompaniment_path)
        raw_frames = chords_service.detect_chord_frames(accompaniment_path)
        valid_frames = [f for f in raw_frames if chords_service.is_major_or_minor(f.name)]

        _set_phase(db, song, SongPhase.SMOOTHING)
        hop_duration = chords_service.HOP_SIZE / 44100
        raw_segments = merge_consecutive_frames(valid_frames, hop_duration)
        smoothed = smooth_chord_segments(raw_segments, settings.min_chord_duration_seconds)

        _set_phase(db, song, SongPhase.SYNCING)
        chords = [
            Chord(name=s.name, start=s.start, end=s.end, confidence=s.confidence)
            for s in smoothed
        ]
        sync_chords_to_words(chords, lyric_lines)  # validated eagerly; consumed on read/export

        result = db.query(AnalysisResult).filter_by(song_id=song.id).one_or_none()
        if result is None:
            result = AnalysisResult(song_id=song.id)
        result.key = key
        result.tempo = tempo
        result.lyrics = [line.model_dump() for line in lyric_lines]
        result.chords = [c.model_dump() for c in chords]
        db.add(result)

        _set_phase(db, song, SongPhase.DONE)
    except Exception as exc:  # noqa: BLE001 - report any pipeline failure on the song row
        db.rollback()
        song = db.get(Song, song_id)
        if song is not None:
            _set_phase(db, song, SongPhase.ERROR, error=str(exc))
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
        db.close()
