import subprocess

import pytest

from app.services.audio import (
    AudioProcessingError,
    build_convert_cmd,
    build_probe_cmd,
    convert_to_wav,
    get_duration_seconds,
)


def test_build_convert_cmd_includes_loudnorm_and_stereo():
    cmd = build_convert_cmd("in.mp3", "out.wav", sample_rate=44100)
    assert cmd[0] == "ffmpeg"
    assert "in.mp3" in cmd
    assert "out.wav" in cmd
    assert "44100" in cmd
    assert any("loudnorm" in part for part in cmd)


def test_build_probe_cmd_targets_input():
    cmd = build_probe_cmd("in.wav")
    assert cmd[0] == "ffprobe"
    assert "in.wav" in cmd


def test_convert_to_wav_raises_on_ffmpeg_failure(monkeypatch):
    def fake_run(cmd, capture_output, text):
        return subprocess.CompletedProcess(cmd, returncode=1, stdout="", stderr="invalid data")

    monkeypatch.setattr(subprocess, "run", fake_run)
    with pytest.raises(AudioProcessingError, match="ffmpeg"):
        convert_to_wav("in.mp3", "out.wav")


def test_convert_to_wav_returns_output_path_on_success(monkeypatch):
    def fake_run(cmd, capture_output, text):
        return subprocess.CompletedProcess(cmd, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = convert_to_wav("in.mp3", "out.wav")
    assert result == "out.wav"


def test_get_duration_seconds_parses_ffprobe_json(monkeypatch):
    def fake_run(cmd, capture_output, text):
        return subprocess.CompletedProcess(
            cmd, returncode=0, stdout='{"format": {"duration": "12.34"}}', stderr=""
        )

    monkeypatch.setattr(subprocess, "run", fake_run)
    assert get_duration_seconds("in.wav") == 12.34


def test_get_duration_seconds_raises_on_probe_failure(monkeypatch):
    def fake_run(cmd, capture_output, text):
        return subprocess.CompletedProcess(cmd, returncode=1, stdout="", stderr="no such file")

    monkeypatch.setattr(subprocess, "run", fake_run)
    with pytest.raises(AudioProcessingError):
        get_duration_seconds("missing.wav")
