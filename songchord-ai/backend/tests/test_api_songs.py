import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import AnalysisResult, Song, SongPhase


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client(tmp_path):
    test_settings = Settings(storage_dir=str(tmp_path))
    app.dependency_overrides[get_settings] = lambda: test_settings
    return TestClient(app)


def test_upload_song_success(client):
    resp = client.post(
        "/api/songs",
        files={"file": ("mi cancion.mp3", b"fake mp3 bytes", "audio/mpeg")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "mi cancion"
    assert data["original_filename"] == "mi cancion.mp3"
    assert data["phase"] == "uploaded"
    assert data["result"] is None


def test_upload_song_rejects_bad_extension(client):
    resp = client.post(
        "/api/songs",
        files={"file": ("song.ogg", b"data", "audio/ogg")},
    )
    assert resp.status_code == 400
    assert "Formato no soportado" in resp.json()["detail"]


def test_upload_song_rejects_oversized_file(client, tmp_path):
    test_settings = Settings(storage_dir=str(tmp_path), max_upload_bytes=10)
    app.dependency_overrides[get_settings] = lambda: test_settings
    resp = client.post(
        "/api/songs",
        files={"file": ("song.mp3", b"0123456789ABCDEF", "audio/mpeg")},
    )
    assert resp.status_code == 400
    assert "tamaño máximo" in resp.json()["detail"]


def test_get_song_not_found(client):
    resp = client.get("/api/songs/does-not-exist")
    assert resp.status_code == 404


def test_get_song_audio_streams_uploaded_file(client):
    upload = client.post(
        "/api/songs",
        files={"file": ("song.mp3", b"fake mp3 bytes", "audio/mpeg")},
    )
    song_id = upload.json()["id"]
    resp = client.get(f"/api/songs/{song_id}/audio")
    assert resp.status_code == 200
    assert resp.content == b"fake mp3 bytes"


def test_get_song_audio_not_found(client):
    resp = client.get("/api/songs/does-not-exist/audio")
    assert resp.status_code == 404


def test_analyze_triggers_celery_task(client, monkeypatch):
    upload = client.post(
        "/api/songs",
        files={"file": ("song.mp3", b"fake mp3 bytes", "audio/mpeg")},
    )
    song_id = upload.json()["id"]

    from app.tasks import pipeline as pipeline_module

    calls = []
    monkeypatch.setattr(pipeline_module.analyze_song_task, "delay", lambda sid: calls.append(sid))

    resp = client.post(f"/api/songs/{song_id}/analyze")
    assert resp.status_code == 200
    assert resp.json()["phase"] == "validating"
    assert calls == [song_id]


def test_analyze_rejects_when_already_running(client, monkeypatch):
    upload = client.post(
        "/api/songs",
        files={"file": ("song.mp3", b"fake mp3 bytes", "audio/mpeg")},
    )
    song_id = upload.json()["id"]

    from app.tasks import pipeline as pipeline_module

    monkeypatch.setattr(pipeline_module.analyze_song_task, "delay", lambda sid: None)
    client.post(f"/api/songs/{song_id}/analyze")

    resp = client.post(f"/api/songs/{song_id}/analyze")
    assert resp.status_code == 409


def test_update_song_edits_lyrics_and_chords(client):
    upload = client.post(
        "/api/songs",
        files={"file": ("song.mp3", b"fake mp3 bytes", "audio/mpeg")},
    )
    song_id = upload.json()["id"]

    payload = {
        "lyrics": [
            {
                "text": "Hoy vuelvo a recordar",
                "start": 12.4,
                "end": 16.8,
                "words": [{"text": "Hoy", "start": 12.4, "end": 12.8}],
            }
        ],
        "chords": [{"name": "G", "start": 12.2, "end": 14.7, "confidence": 0.86}],
        "capo": 2,
        "transpose_semitones": 1,
    }
    resp = client.put(f"/api/songs/{song_id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"]["capo"] == 2
    assert data["result"]["transpose_semitones"] == 1
    assert data["result"]["edited"] is True
    assert data["result"]["lyrics"][0]["text"] == "Hoy vuelvo a recordar"
    assert data["result"]["chords"][0]["name"] == "G"


def test_export_requires_done_phase(client):
    upload = client.post(
        "/api/songs",
        files={"file": ("song.mp3", b"fake mp3 bytes", "audio/mpeg")},
    )
    song_id = upload.json()["id"]
    resp = client.get(f"/api/songs/{song_id}/export", params={"format": "txt"})
    assert resp.status_code == 409


def test_export_txt_when_done(client):
    upload = client.post(
        "/api/songs",
        files={"file": ("song.mp3", b"fake mp3 bytes", "audio/mpeg")},
    )
    song_id = upload.json()["id"]

    db = SessionLocal()
    song = db.get(Song, song_id)
    song.phase = SongPhase.DONE
    song.duration = 20.0
    db.add(song)
    result = AnalysisResult(
        song_id=song_id,
        key="G",
        tempo=120,
        lyrics=[
            {
                "text": "Hoy vuelvo a recordar",
                "start": 12.4,
                "end": 16.8,
                "words": [{"text": "Hoy", "start": 12.4, "end": 12.8}],
            }
        ],
        chords=[{"name": "G", "start": 12.2, "end": 14.7, "confidence": 0.86}],
    )
    db.add(result)
    db.commit()
    db.close()

    resp = client.get(f"/api/songs/{song_id}/export", params={"format": "txt"})
    assert resp.status_code == 200
    assert "Hoy vuelvo a recordar" in resp.text

    resp_json = client.get(f"/api/songs/{song_id}/export", params={"format": "json"})
    assert resp_json.status_code == 200
    body = resp_json.json()
    assert body["key"] == "G"

    resp_cho = client.get(f"/api/songs/{song_id}/export", params={"format": "chordpro"})
    assert resp_cho.status_code == 200
    assert "{key: G}" in resp_cho.text
