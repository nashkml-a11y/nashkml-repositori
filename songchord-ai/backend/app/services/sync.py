"""Synchronize each chord to the nearest lyric word (by start time)."""

from dataclasses import dataclass

from app.domain import Chord, LyricLine


@dataclass
class WordRef:
    line_index: int
    word_index: int
    start: float
    end: float


@dataclass
class ChordSync:
    chord: Chord
    line_index: int | None
    word_index: int | None


def _flatten_words(lines: list[LyricLine]) -> list[WordRef]:
    refs = []
    for li, line in enumerate(lines):
        for wi, word in enumerate(line.words):
            refs.append(WordRef(line_index=li, word_index=wi, start=word.start, end=word.end))
    return refs


def _nearest_word_ref(t: float, refs: list[WordRef]) -> WordRef | None:
    if not refs:
        return None
    containing = [r for r in refs if r.start <= t < r.end]
    if containing:
        return containing[0]
    return min(refs, key=lambda r: abs(r.start - t))


def sync_chords_to_words(chords: list[Chord], lines: list[LyricLine]) -> list[ChordSync]:
    refs = _flatten_words(lines)
    result = []
    for chord in chords:
        ref = _nearest_word_ref(chord.start, refs)
        result.append(
            ChordSync(
                chord=chord,
                line_index=ref.line_index if ref else None,
                word_index=ref.word_index if ref else None,
            )
        )
    return result
