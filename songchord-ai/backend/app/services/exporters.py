"""Export an analyzed song to TXT (chord-over-lyric sheet), ChordPro or JSON."""

import json

from app.domain import AnalysisData, LyricLine
from app.services.sync import ChordSync, sync_chords_to_words
from app.services.transpose import display_chord


def _word_char_offsets(line: LyricLine) -> list[int]:
    """Best-effort character offset of each word within line.text, found by
    scanning left to right so repeated words don't collide."""
    offsets = []
    cursor = 0
    for word in line.words:
        idx = line.text.find(word.text, cursor)
        if idx == -1:
            idx = cursor
        offsets.append(idx)
        cursor = idx + len(word.text)
    return offsets


def _chords_by_line(syncs: list[ChordSync]) -> dict[int, dict[int, list[ChordSync]]]:
    by_line: dict[int, dict[int, list[ChordSync]]] = {}
    for s in syncs:
        if s.line_index is None or s.word_index is None:
            continue
        by_line.setdefault(s.line_index, {}).setdefault(s.word_index, []).append(s)
    return by_line


def export_txt(analysis: AnalysisData) -> str:
    syncs = sync_chords_to_words(analysis.chords, analysis.lyrics)
    by_line = _chords_by_line(syncs)

    out: list[str] = [analysis.title] if analysis.title else []
    meta = []
    if analysis.key:
        meta.append(f"Tonalidad: {analysis.key}")
    if analysis.tempo:
        meta.append(f"Tempo: {round(analysis.tempo)} BPM")
    if analysis.capo:
        meta.append(f"Capo: {analysis.capo}")
    if meta:
        out.append(" | ".join(meta))
    if out:
        out.append("")

    for li, line in enumerate(analysis.lyrics):
        offsets = _word_char_offsets(line)
        placements: list[tuple[int, str]] = []
        for wi, word_syncs in by_line.get(li, {}).items():
            pos = offsets[wi] if wi < len(offsets) else 0
            for s in word_syncs:
                name = display_chord(s.chord.name, analysis.transpose_semitones, analysis.capo)
                placements.append((pos, name))
        placements.sort()

        chord_line = ""
        for pos, name in placements:
            if pos < len(chord_line):
                pos = len(chord_line) + 1
            chord_line = chord_line.ljust(pos) + name
        if chord_line.strip():
            out.append(chord_line)
        out.append(line.text)

    return "\n".join(out).rstrip() + "\n"


def export_chordpro(analysis: AnalysisData) -> str:
    syncs = sync_chords_to_words(analysis.chords, analysis.lyrics)
    by_line = _chords_by_line(syncs)

    out: list[str] = []
    if analysis.title:
        out.append(f"{{title: {analysis.title}}}")
    if analysis.key:
        out.append(f"{{key: {analysis.key}}}")
    if analysis.tempo:
        out.append(f"{{tempo: {round(analysis.tempo)}}}")
    if analysis.capo:
        out.append(f"{{capo: {analysis.capo}}}")
    if out:
        out.append("")

    for li, line in enumerate(analysis.lyrics):
        offsets = _word_char_offsets(line)
        per_word = by_line.get(li, {})
        text = line.text
        # insert right-to-left so earlier offsets stay valid
        for wi in sorted(per_word.keys(), key=lambda w: offsets[w] if w < len(offsets) else 0, reverse=True):
            pos = offsets[wi] if wi < len(offsets) else 0
            tag = "".join(
                f"[{display_chord(s.chord.name, analysis.transpose_semitones, analysis.capo)}]"
                for s in per_word[wi]
            )
            text = text[:pos] + tag + text[pos:]
        out.append(text)

    return "\n".join(out).rstrip() + "\n"


def export_json(analysis: AnalysisData) -> str:
    data = analysis.model_dump()
    for chord in data["chords"]:
        chord["name"] = display_chord(chord["name"], analysis.transpose_semitones, analysis.capo)
    return json.dumps(data, indent=2, ensure_ascii=False)
