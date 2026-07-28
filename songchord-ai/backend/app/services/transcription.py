"""Transcribe the isolated vocal track with word-level timestamps via OpenAI STT.

The API key is read from server-side settings only (never sent to the
frontend) and requests are retried on transient network/API errors.
"""

from openai import APIConnectionError, APIError, OpenAI, RateLimitError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import Settings
from app.domain import LyricLine, Word


class TranscriptionError(RuntimeError):
    pass


def _assign_words_to_segment(words: list[dict], seg_start: float, seg_end: float) -> list[Word]:
    return [
        Word(text=w["word"].strip(), start=w["start"], end=w["end"])
        for w in words
        if seg_start <= w["start"] < seg_end
    ]


@retry(
    reraise=True,
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((APIConnectionError, RateLimitError, APIError)),
)
def transcribe_vocals(vocals_wav_path: str, settings: Settings) -> list[LyricLine]:
    if not settings.openai_api_key:
        raise TranscriptionError("OPENAI_API_KEY no está configurada.")

    client = OpenAI(api_key=settings.openai_api_key)
    with open(vocals_wav_path, "rb") as audio_file:
        response = client.audio.transcriptions.create(
            model=settings.openai_stt_model,
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["word", "segment"],
        )

    words = [w if isinstance(w, dict) else w.model_dump() for w in (response.words or [])]
    segments = [s if isinstance(s, dict) else s.model_dump() for s in (response.segments or [])]

    lines = []
    for seg in segments:
        text = seg["text"].strip()
        if not text:
            continue
        seg_words = _assign_words_to_segment(words, seg["start"], seg["end"])
        lines.append(
            LyricLine(text=text, start=seg["start"], end=seg["end"], words=seg_words)
        )
    return lines
