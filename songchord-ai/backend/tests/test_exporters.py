import json

from app.domain import AnalysisData, Chord, LyricLine, Word
from app.services.exporters import export_chordpro, export_json, export_txt


def sample_analysis():
    return AnalysisData(
        title="Mi Cancion",
        duration=20.0,
        key="G",
        tempo=120,
        capo=0,
        transpose_semitones=0,
        lyrics=[
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
            )
        ],
        chords=[
            Chord(name="G", start=12.4, end=13.5, confidence=0.9),
            Chord(name="C", start=13.6, end=16.8, confidence=0.8),
        ],
    )


def test_export_txt_contains_title_lyrics_and_chords():
    text = export_txt(sample_analysis())
    assert "Mi Cancion" in text
    assert "Hoy vuelvo a recordar" in text
    assert "G" in text
    assert "C" in text
    lines = text.splitlines()
    lyric_line_idx = lines.index("Hoy vuelvo a recordar")
    chord_line = lines[lyric_line_idx - 1]
    assert "G" in chord_line


def test_export_txt_applies_transposition():
    analysis = sample_analysis()
    analysis.transpose_semitones = 2  # G -> A, C -> D
    text = export_txt(analysis)
    assert "A" in text
    assert "D" in text


def test_export_chordpro_inlines_brackets():
    chordpro = export_chordpro(sample_analysis())
    assert "{title: Mi Cancion}" in chordpro
    assert "{key: G}" in chordpro
    assert "[G]" in chordpro
    assert "[C]" in chordpro
    # word text must still be present, chord tag inserted before it
    assert "Hoy" in chordpro.replace("[G]", "")


def test_export_json_roundtrip_and_transposition():
    analysis = sample_analysis()
    analysis.capo = 2
    raw = export_json(analysis)
    data = json.loads(raw)
    assert data["title"] == "Mi Cancion"
    assert data["key"] == "G"
    # capo 2 shifts shape down: G -> F, C -> A#
    names = [c["name"] for c in data["chords"]]
    assert names == ["F", "A#"]


def test_export_txt_handles_empty_lyrics():
    analysis = AnalysisData(title="Instrumental", chords=[])
    text = export_txt(analysis)
    assert "Instrumental" in text
