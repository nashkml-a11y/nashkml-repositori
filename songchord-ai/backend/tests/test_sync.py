from app.domain import Chord, LyricLine, Word
from app.services.sync import sync_chords_to_words


def make_lines():
    return [
        LyricLine(
            text="Hoy vuelvo a recordar",
            start=12.4,
            end=16.8,
            words=[
                Word(text="Hoy", start=12.4, end=12.8),
                Word(text="vuelvo", start=12.9, end=13.4),
                Word(text="a", start=13.5, end=13.6),
                Word(text="recordar", start=13.7, end=14.5),
            ],
        ),
        LyricLine(
            text="tu voz",
            start=17.0,
            end=18.0,
            words=[
                Word(text="tu", start=17.0, end=17.3),
                Word(text="voz", start=17.4, end=18.0),
            ],
        ),
    ]


def test_chord_snaps_to_containing_word():
    lines = make_lines()
    chords = [Chord(name="G", start=13.0, end=14.0, confidence=0.9)]
    result = sync_chords_to_words(chords, lines)
    assert result[0].line_index == 0
    assert result[0].word_index == 1  # "vuelvo" spans 12.9-13.4


def test_chord_snaps_to_nearest_when_between_words():
    lines = make_lines()
    # 16.9 sits between line 0's last word (ends 14.5) and line 1's first word (starts 17.0)
    chords = [Chord(name="C", start=16.9, end=17.0, confidence=0.7)]
    result = sync_chords_to_words(chords, lines)
    assert result[0].line_index == 1
    assert result[0].word_index == 0


def test_no_words_returns_none():
    chords = [Chord(name="C", start=1.0, end=2.0, confidence=0.5)]
    result = sync_chords_to_words(chords, [])
    assert result[0].line_index is None
    assert result[0].word_index is None


def test_preserves_order_and_count():
    lines = make_lines()
    chords = [
        Chord(name="G", start=12.5, end=13.0, confidence=0.9),
        Chord(name="C", start=17.5, end=18.0, confidence=0.8),
    ]
    result = sync_chords_to_words(chords, lines)
    assert len(result) == 2
    assert result[0].chord.name == "G"
    assert result[1].chord.name == "C"
