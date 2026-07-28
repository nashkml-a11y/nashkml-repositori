import pytest

from app.services.transpose import apply_capo, display_chord, parse_chord, transpose_chord


@pytest.mark.parametrize(
    "name,expected",
    [
        ("C", ("C", "")),
        ("Cm", ("C", "m")),
        ("C#", ("C#", "")),
        ("C#m", ("C#", "m")),
        ("Db", ("C#", "")),
        ("Bb", ("A#", "")),
        ("Bbm", ("A#", "m")),
    ],
)
def test_parse_chord(name, expected):
    assert parse_chord(name) == expected


def test_transpose_up_wraps_around():
    assert transpose_chord("B", 1) == "C"


def test_transpose_down_wraps_around():
    assert transpose_chord("C", -1) == "B"


def test_transpose_preserves_minor_suffix():
    assert transpose_chord("Am", 2) == "Bm"


def test_transpose_zero_is_identity():
    assert transpose_chord("G", 0) == "G"


def test_transpose_no_chord_passthrough():
    assert transpose_chord("N", 5) == "N"


def test_transpose_flat_input_normalizes_to_sharp():
    assert transpose_chord("Eb", 0) == "D#"


def test_capo_two_on_d_gives_c_shape():
    # Standard "play C shape, capo 2, sounds like D" convention.
    assert apply_capo("D", 2) == "C"


def test_capo_zero_is_identity():
    assert apply_capo("G", 0) == "G"


def test_display_chord_applies_transpose_then_capo():
    # Song detected in D, user transposes up a tone to E, then adds capo 2:
    # shape should be D (E transposed down 2 semitones for the capo).
    assert display_chord("D", transpose_semitones=2, capo=2) == "D"


def test_display_chord_no_modification():
    assert display_chord("Gm") == "Gm"
