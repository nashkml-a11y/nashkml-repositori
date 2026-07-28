import pytest

from app.config import Settings
from app.services.validation import UploadValidationError, validate_upload


@pytest.fixture
def settings():
    return Settings(_env_file=None)


def test_valid_mp3_passes(settings):
    validate_upload("song.mp3", "audio/mpeg", 1024, settings)


def test_valid_wav_passes(settings):
    validate_upload("song.wav", "audio/wav", 1024, settings)


def test_rejects_unsupported_extension(settings):
    with pytest.raises(UploadValidationError, match="Formato no soportado"):
        validate_upload("song.ogg", "audio/ogg", 1024, settings)


def test_rejects_unsupported_mime(settings):
    with pytest.raises(UploadValidationError, match="Tipo MIME"):
        validate_upload("song.mp3", "text/plain", 1024, settings)


def test_rejects_empty_file(settings):
    with pytest.raises(UploadValidationError, match="vacío"):
        validate_upload("song.mp3", "audio/mpeg", 0, settings)


def test_rejects_oversized_file(settings):
    with pytest.raises(UploadValidationError, match="tamaño máximo"):
        validate_upload("song.mp3", "audio/mpeg", settings.max_upload_bytes + 1, settings)


def test_rejects_missing_filename(settings):
    with pytest.raises(UploadValidationError):
        validate_upload("", "audio/mpeg", 1024, settings)
