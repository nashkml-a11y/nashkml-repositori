import subprocess

import pytest

from app.services.separation import (
    STEMS,
    SeparationError,
    build_accompaniment,
    build_demucs_cmd,
    build_mix_cmd,
    separate_stems,
)


def test_build_demucs_cmd_uses_htdemucs_model():
    cmd = build_demucs_cmd("song.wav", "/out")
    assert "demucs" in cmd
    assert "htdemucs" in cmd
    assert "song.wav" in cmd
    assert "/out" in cmd


def test_build_mix_cmd_includes_all_inputs():
    cmd = build_mix_cmd(["a.wav", "b.wav", "c.wav"], "mix.wav")
    assert cmd.count("-i") == 3
    assert "mix.wav" in cmd
    assert any("amix=inputs=3" in part for part in cmd)


def test_separate_stems_raises_when_demucs_fails(monkeypatch, tmp_path):
    def fake_run(cmd, capture_output, text):
        return subprocess.CompletedProcess(cmd, returncode=1, stdout="", stderr="cuda error")

    monkeypatch.setattr(subprocess, "run", fake_run)
    with pytest.raises(SeparationError, match="Demucs"):
        separate_stems(str(tmp_path / "song.wav"), str(tmp_path / "out"))


def test_separate_stems_raises_when_output_missing(monkeypatch, tmp_path):
    def fake_run(cmd, capture_output, text):
        return subprocess.CompletedProcess(cmd, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    with pytest.raises(SeparationError, match="no generó"):
        separate_stems(str(tmp_path / "song.wav"), str(tmp_path / "out"))


def test_separate_stems_returns_all_expected_stems(monkeypatch, tmp_path):
    output_dir = tmp_path / "out"
    stems_dir = output_dir / "htdemucs" / "song"
    stems_dir.mkdir(parents=True)
    for stem in STEMS:
        (stems_dir / f"{stem}.wav").write_bytes(b"")

    def fake_run(cmd, capture_output, text):
        return subprocess.CompletedProcess(cmd, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = separate_stems(str(tmp_path / "song.wav"), str(output_dir))
    assert set(result.keys()) == set(STEMS)
    assert all(result[s].endswith(f"{s}.wav") for s in STEMS)


def test_build_accompaniment_raises_on_ffmpeg_failure(monkeypatch, tmp_path):
    def fake_run(cmd, capture_output, text):
        return subprocess.CompletedProcess(cmd, returncode=1, stdout="", stderr="mix error")

    monkeypatch.setattr(subprocess, "run", fake_run)
    stems = {"drums": "d.wav", "bass": "b.wav", "other": "o.wav", "vocals": "v.wav"}
    with pytest.raises(SeparationError, match="mezclar"):
        build_accompaniment(stems, str(tmp_path / "accompaniment.wav"))
