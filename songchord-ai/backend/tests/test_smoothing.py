from app.services.smoothing import (
    ChordFrame,
    ChordSegment,
    merge_consecutive_frames,
    smooth_chord_segments,
    unify_consecutive,
)


def test_merge_consecutive_frames_groups_runs():
    frames = [
        ChordFrame("C", 0.0, 0.9),
        ChordFrame("C", 0.2, 0.8),
        ChordFrame("G", 0.4, 0.7),
        ChordFrame("G", 0.6, 0.9),
        ChordFrame("G", 0.8, 0.85),
    ]
    segments = merge_consecutive_frames(frames, hop_duration=0.2)
    assert len(segments) == 2
    assert segments[0].name == "C"
    assert segments[0].start == 0.0
    assert round(segments[0].end, 5) == 0.4
    assert round(segments[0].confidence, 5) == 0.85
    assert segments[1].name == "G"
    assert segments[1].start == 0.4
    assert round(segments[1].end, 5) == 1.0


def test_merge_consecutive_frames_empty():
    assert merge_consecutive_frames([], 0.2) == []


def test_unify_consecutive_merges_same_name_neighbors():
    segments = [
        ChordSegment("C", 0.0, 1.0, 0.9),
        ChordSegment("C", 1.0, 2.0, 0.8),
        ChordSegment("G", 2.0, 3.0, 0.7),
    ]
    result = unify_consecutive(segments)
    assert len(result) == 2
    assert result[0].name == "C"
    assert result[0].start == 0.0
    assert result[0].end == 2.0


def test_smooth_removes_short_blip_between_longer_segments():
    # A very short "blip" chord between two longer stable chords should be
    # absorbed into its longest neighbour, not reported as a real change.
    segments = [
        ChordSegment("C", 0.0, 5.0, 0.9),
        ChordSegment("F", 5.0, 5.1, 0.5),  # 0.1s blip, below min_duration
        ChordSegment("G", 5.1, 10.0, 0.9),
    ]
    result = smooth_chord_segments(segments, min_duration=0.8)
    # The blip is folded into its longest neighbour (C, duration 5.0 >= 4.9),
    # so the boundary shifts to the blip's end rather than disappearing outright.
    assert [s.name for s in result] == ["C", "G"]
    assert result[0].start == 0.0
    assert result[0].end == 5.1
    assert result[1].start == 5.1
    assert result[1].end == 10.0


def test_smooth_then_unify_collapses_reemerged_duplicates():
    # After folding out the short middle segment, the two "C" segments
    # become adjacent and must be unified into one.
    segments = [
        ChordSegment("C", 0.0, 3.0, 0.9),
        ChordSegment("Am", 3.0, 3.2, 0.4),  # short blip
        ChordSegment("C", 3.2, 6.0, 0.9),
    ]
    result = smooth_chord_segments(segments, min_duration=0.8)
    assert len(result) == 1
    assert result[0].name == "C"
    assert result[0].start == 0.0
    assert result[0].end == 6.0


def test_smooth_keeps_single_segment_untouched():
    segments = [ChordSegment("C", 0.0, 0.3, 0.9)]
    result = smooth_chord_segments(segments, min_duration=0.8)
    assert result == segments
