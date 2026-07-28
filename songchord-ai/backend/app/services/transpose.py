"""Chord transposition and capo shape calculation.

MVP scope: major and minor chords only (root note + optional "m" suffix).
"""

NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
ENHARMONIC_FLATS = {"Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"}
NO_CHORD = "N"


def parse_chord(name: str) -> tuple[str, str]:
    """Split a chord name into (root, suffix). suffix is "" for major, "m" for minor."""
    if not name or name == NO_CHORD:
        return name, ""
    root = name[0].upper()
    idx = 1
    if idx < len(name) and name[idx] in ("#", "b"):
        root += name[idx]
        idx += 1
    suffix = name[idx:]
    root = ENHARMONIC_FLATS.get(root, root)
    return root, suffix


def transpose_chord(name: str, semitones: int) -> str:
    """Shift a chord's root by N semitones (may be negative), preserving major/minor.

    Always re-derives the name from (root, suffix) so flat spellings (e.g. "Eb")
    are normalized to their sharp equivalent even when semitones is 0.
    """
    if not name or name == NO_CHORD:
        return name
    root, suffix = parse_chord(name)
    if root not in NOTES:
        return name
    idx = (NOTES.index(root) + semitones) % 12
    return NOTES[idx] + suffix


def apply_capo(name: str, capo: int) -> str:
    """Shape to finger on a guitar with a capo at fret `capo`, so that it sounds
    like `name`. Fretting a shape N frets up raises its pitch by N semitones, so
    the shape must be the sounding chord transposed DOWN by `capo` semitones.
    """
    return transpose_chord(name, -capo)


def display_chord(name: str, transpose_semitones: int = 0, capo: int = 0) -> str:
    """Full pipeline: apply manual transposition, then compute the capo shape."""
    transposed = transpose_chord(name, transpose_semitones)
    return apply_capo(transposed, capo)
