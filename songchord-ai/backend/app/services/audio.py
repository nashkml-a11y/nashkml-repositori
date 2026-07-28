"""FFmpeg-based audio normalization/conversion.

Every uploaded file (mp3/wav/m4a) is converted to a single canonical WAV
(44.1kHz, stereo, loudness-normalized) before any further processing, so
Demucs and Essentia always operate on a consistent format.
"""

import json
import subprocess

from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

SAMPLE_RATE = 44100


class AudioProcessingError(RuntimeError):
    pass


def build_convert_cmd(input_path: str, output_path: str, sample_rate: int = SAMPLE_RATE) -> list[str]:
    return [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-ar", str(sample_rate),
        "-ac", "2",
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        output_path,
    ]


def build_probe_cmd(input_path: str) -> list[str]:
    return [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json",
        input_path,
    ]


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(AudioProcessingError),
)
def convert_to_wav(input_path: str, output_path: str, sample_rate: int = SAMPLE_RATE) -> str:
    cmd = build_convert_cmd(input_path, output_path, sample_rate)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise AudioProcessingError(f"ffmpeg falló al convertir el audio: {proc.stderr[-2000:]}")
    return output_path


def get_duration_seconds(input_path: str) -> float:
    cmd = build_probe_cmd(input_path)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise AudioProcessingError(f"ffprobe falló al leer el audio: {proc.stderr[-2000:]}")
    data = json.loads(proc.stdout)
    try:
        return float(data["format"]["duration"])
    except (KeyError, TypeError, ValueError) as exc:
        raise AudioProcessingError("No se pudo determinar la duración del audio.") from exc
