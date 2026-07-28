"""Smooth raw frame-level chord detections into stable chord segments.

Essentia's ChordsDetection yields one chord label per analysis frame (e.g. every
~0.1-0.2s). Frames are first merged into runs of identical consecutive labels,
then any run shorter than `min_duration` is folded into its longest neighbour
(a real chord change rarely lasts under ~0.8s), and finally any newly-adjacent
identical segments are unified.
"""

from dataclasses import dataclass


@dataclass
class ChordFrame:
    name: str
    time: float
    confidence: float


@dataclass
class ChordSegment:
    name: str
    start: float
    end: float
    confidence: float


def merge_consecutive_frames(frames: list[ChordFrame], hop_duration: float) -> list[ChordSegment]:
    """Collapse consecutive frames sharing the same chord label into segments."""
    if not frames:
        return []

    segments: list[ChordSegment] = []
    run_name = frames[0].name
    run_start = frames[0].time
    run_confidences = [frames[0].confidence]
    last_time = frames[0].time

    for frame in frames[1:]:
        if frame.name == run_name:
            run_confidences.append(frame.confidence)
            last_time = frame.time
            continue
        segments.append(
            ChordSegment(
                name=run_name,
                start=run_start,
                end=last_time + hop_duration,
                confidence=sum(run_confidences) / len(run_confidences),
            )
        )
        run_name = frame.name
        run_start = frame.time
        run_confidences = [frame.confidence]
        last_time = frame.time

    segments.append(
        ChordSegment(
            name=run_name,
            start=run_start,
            end=last_time + hop_duration,
            confidence=sum(run_confidences) / len(run_confidences),
        )
    )
    return segments


def _weighted_confidence(a: ChordSegment, b: ChordSegment) -> float:
    duration_a = a.end - a.start
    duration_b = b.end - b.start
    total = duration_a + duration_b
    if total <= 0:
        return (a.confidence + b.confidence) / 2
    return (a.confidence * duration_a + b.confidence * duration_b) / total


def unify_consecutive(segments: list[ChordSegment]) -> list[ChordSegment]:
    """Merge adjacent segments that share the same chord name."""
    if not segments:
        return []
    result = [segments[0]]
    for seg in segments[1:]:
        last = result[-1]
        if seg.name == last.name:
            result[-1] = ChordSegment(
                name=last.name,
                start=last.start,
                end=seg.end,
                confidence=_weighted_confidence(last, seg),
            )
        else:
            result.append(seg)
    return result


def smooth_chord_segments(
    segments: list[ChordSegment], min_duration: float
) -> list[ChordSegment]:
    """Fold segments shorter than `min_duration` into their longest neighbour."""
    segments = list(segments)

    changed = True
    while changed and len(segments) > 1:
        changed = False
        for i, seg in enumerate(segments):
            if seg.end - seg.start >= min_duration:
                continue

            prev_seg = segments[i - 1] if i > 0 else None
            next_seg = segments[i + 1] if i + 1 < len(segments) else None
            if prev_seg is None and next_seg is None:
                break

            if prev_seg is None:
                target_is_prev = False
            elif next_seg is None:
                target_is_prev = True
            else:
                prev_dur = prev_seg.end - prev_seg.start
                next_dur = next_seg.end - next_seg.start
                target_is_prev = prev_dur >= next_dur

            if target_is_prev:
                merged = ChordSegment(
                    name=prev_seg.name,
                    start=prev_seg.start,
                    end=seg.end,
                    confidence=_weighted_confidence(prev_seg, seg),
                )
                segments[i - 1] = merged
                del segments[i]
            else:
                merged = ChordSegment(
                    name=next_seg.name,
                    start=seg.start,
                    end=next_seg.end,
                    confidence=_weighted_confidence(seg, next_seg),
                )
                segments[i + 1] = merged
                del segments[i]
            changed = True
            break

    return unify_consecutive(segments)
