"""Key, tempo and frame-level chord detection over the accompaniment track,
using Essentia (HPCP chromagram -> ChordsDetection, KeyExtractor, RhythmExtractor2013).

Only major/minor chord labels are kept for the MVP; anything else Essentia
may emit (e.g. "N" for no-chord) is passed through and filtered by the caller.
"""

import re

from app.services.smoothing import ChordFrame

_MAJOR_MINOR_RE = re.compile(r"^[A-G]#?m?$")

FRAME_SIZE = 4096
HOP_SIZE = 2048


class ChordAnalysisError(RuntimeError):
    pass


def analyze_key_and_tempo(audio_path: str) -> tuple[str, float]:
    import essentia.standard as es

    try:
        audio = es.MonoLoader(filename=audio_path)()
        key, scale, _strength = es.KeyExtractor()(audio)
        bpm, _ticks, _confidence, _estimates, _intervals = es.RhythmExtractor2013()(audio)
    except Exception as exc:  # pragma: no cover - depends on essentia runtime
        raise ChordAnalysisError(f"Essentia falló al analizar tonalidad/tempo: {exc}") from exc

    key_name = key if scale == "major" else f"{key}m"
    return key_name, float(bpm)


def detect_chord_frames(audio_path: str, sample_rate: int = 44100) -> list[ChordFrame]:
    import essentia.standard as es

    try:
        audio = es.MonoLoader(filename=audio_path, sampleRate=sample_rate)()

        windowing = es.Windowing(type="blackmanharris62")
        spectrum = es.Spectrum()
        spectral_peaks = es.SpectralPeaks(orderBy="magnitude", magnitudeThreshold=1e-5, minFrequency=20, maxFrequency=3500)
        hpcp = es.HPCP()

        hpcp_frames = []
        for frame in es.FrameGenerator(audio, frameSize=FRAME_SIZE, hopSize=HOP_SIZE, startFromZero=True):
            spec = spectrum(windowing(frame))
            freqs, mags = spectral_peaks(spec)
            hpcp_frames.append(hpcp(freqs, mags))

        chords, strengths = es.ChordsDetection(hopSize=HOP_SIZE, sampleRate=sample_rate)(hpcp_frames)
    except Exception as exc:  # pragma: no cover - depends on essentia runtime
        raise ChordAnalysisError(f"Essentia falló al detectar acordes: {exc}") from exc

    hop_duration = HOP_SIZE / sample_rate
    frames = []
    for i, (name, strength) in enumerate(zip(chords, strengths)):
        frames.append(
            ChordFrame(name=name, time=i * hop_duration, confidence=max(0.0, min(1.0, float(strength))))
        )
    return frames


def is_major_or_minor(chord_name: str) -> bool:
    return bool(_MAJOR_MINOR_RE.match(chord_name))
