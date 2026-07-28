from app.services.transcription import _assign_words_to_segment


def test_assign_words_to_segment_filters_by_time_range():
    words = [
        {"word": "Hoy", "start": 12.4, "end": 12.8},
        {"word": "vuelvo", "start": 12.9, "end": 13.4},
        {"word": "tu", "start": 17.0, "end": 17.3},
    ]
    result = _assign_words_to_segment(words, seg_start=12.0, seg_end=14.0)
    assert [w.text for w in result] == ["Hoy", "vuelvo"]


def test_assign_words_to_segment_strips_whitespace():
    words = [{"word": " Hoy ", "start": 0.0, "end": 1.0}]
    result = _assign_words_to_segment(words, seg_start=0.0, seg_end=2.0)
    assert result[0].text == "Hoy"


def test_assign_words_to_segment_empty_when_no_match():
    words = [{"word": "Hoy", "start": 12.4, "end": 12.8}]
    result = _assign_words_to_segment(words, seg_start=100.0, seg_end=101.0)
    assert result == []
