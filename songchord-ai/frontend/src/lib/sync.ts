import type { Chord, LyricLine } from "./types";

/** Index of the lyric line that should be highlighted at the given playback time. */
export function activeLineIndex(lines: LyricLine[], currentTime: number): number {
  for (let i = 0; i < lines.length; i += 1) {
    if (currentTime >= lines[i].start && currentTime < lines[i].end) {
      return i;
    }
  }
  let lastStarted = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].start <= currentTime) lastStarted = i;
  }
  return lastStarted;
}

export interface ChordPlacement {
  chord: Chord;
  chordIndex: number;
  lineIndex: number | null;
  /** 0..1 position within the line's [start, end) span, for proportional layout. */
  ratio: number | null;
}

/** Assign each chord to the lyric line active at its start time, mirroring the
 * backend's word-level sync but at line granularity (sufficient for on-screen
 * placement; the backend result already carries word-accurate timing). */
export function placeChordsOnLines(chords: Chord[], lines: LyricLine[]): ChordPlacement[] {
  return chords.map((chord, chordIndex) => {
    const lineIndex = activeLineIndex(lines, chord.start);
    if (lineIndex === -1) {
      return { chord, chordIndex, lineIndex: null, ratio: null };
    }
    const line = lines[lineIndex];
    const span = line.end - line.start;
    const ratio = span > 0 ? Math.min(1, Math.max(0, (chord.start - line.start) / span)) : 0;
    return { chord, chordIndex, lineIndex, ratio };
  });
}
