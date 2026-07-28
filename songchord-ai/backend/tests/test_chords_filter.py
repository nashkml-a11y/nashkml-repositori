import pytest

from app.services.chords import is_major_or_minor


@pytest.mark.parametrize(
    "name,expected",
    [
        ("C", True),
        ("Cm", True),
        ("C#", True),
        ("C#m", True),
        ("N", False),
        ("Cdim", False),
        ("Caug", False),
        ("Csus4", False),
        ("C7", False),
    ],
)
def test_is_major_or_minor(name, expected):
    assert is_major_or_minor(name) == expected
