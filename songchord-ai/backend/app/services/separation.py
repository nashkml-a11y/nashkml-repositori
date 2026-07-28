"""Source separation with Demucs (htdemucs: vocals / drums / bass / other).

We run the `demucs` CLI as a subprocess (it manages its own torch device
selection) rather than importing torch models directly in the API/worker
process, keeping memory usage isolated per job.
"""

import os
import subprocess

from tenacity import retry, stop_after_attempt, wait_exponential

MODEL_NAME = "htdemucs"
STEMS = ("vocals", "drums", "bass", "other")


class SeparationError(RuntimeError):
    pass


def build_demucs_cmd(input_wav: str, output_dir: str) -> list[str]:
    return [
        "python3",
        "-m",
        "demucs",
        "-n",
        MODEL_NAME,
        "-o",
        output_dir,
        input_wav,
    ]


@retry(reraise=True, stop=stop_after_attempt(2), wait=wait_exponential(multiplier=2, min=2, max=10))
def separate_stems(input_wav: str, output_dir: str) -> dict[str, str]:
    """Run Demucs and return {stem_name: wav_path} for vocals/drums/bass/other."""
    os.makedirs(output_dir, exist_ok=True)
    cmd = build_demucs_cmd(input_wav, output_dir)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise SeparationError(f"Demucs falló al separar las pistas: {proc.stderr[-2000:]}")

    track_name = os.path.splitext(os.path.basename(input_wav))[0]
    stems_dir = os.path.join(output_dir, MODEL_NAME, track_name)
    stems = {}
    for stem in STEMS:
        path = os.path.join(stems_dir, f"{stem}.wav")
        if not os.path.exists(path):
            raise SeparationError(f"Demucs no generó la pista esperada: {path}")
        stems[stem] = path
    return stems


def build_mix_cmd(stem_paths: list[str], output_path: str) -> list[str]:
    cmd = ["ffmpeg", "-y"]
    for path in stem_paths:
        cmd += ["-i", path]
    filter_complex = f"amix=inputs={len(stem_paths)}:duration=longest:dropout_transition=0"
    cmd += ["-filter_complex", filter_complex, output_path]
    return cmd


def build_accompaniment(stems: dict[str, str], output_path: str) -> str:
    """Mix drums+bass+other into a single 'accompaniment' track for chord analysis."""
    accompaniment_stems = [stems[name] for name in ("drums", "bass", "other")]
    cmd = build_mix_cmd(accompaniment_stems, output_path)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise SeparationError(f"ffmpeg falló al mezclar el acompañamiento: {proc.stderr[-2000:]}")
    return output_path


__all__ = ["separate_stems", "build_accompaniment", "SeparationError", "build_demucs_cmd", "build_mix_cmd"]
