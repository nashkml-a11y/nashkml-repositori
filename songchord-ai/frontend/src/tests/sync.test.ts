import { describe, expect, it } from "vitest";
import { activeLineIndex, placeChordsOnLines } from "../lib/sync";
import type { Chord, LyricLine } from "../lib/types";

const lines: LyricLine[] = [
  { text: "Hoy vuelvo a recordar", start: 12.4, end: 16.8, words: [] },
  { text: "tu voz", start: 17.0, end: 18.0, words: [] },
];

describe("activeLineIndex", () => {
  it("returns the line containing the current time", () => {
    expect(activeLineIndex(lines, 13.0)).toBe(0);
    expect(activeLineIndex(lines, 17.5)).toBe(1);
  });

  it("returns -1 before any line has started", () => {
    expect(activeLineIndex(lines, 0)).toBe(-1);
  });

  it("holds the last started line during a gap between lines", () => {
    expect(activeLineIndex(lines, 16.9)).toBe(0);
  });

  it("returns the last line once past the final line's end", () => {
    expect(activeLineIndex(lines, 100)).toBe(1);
  });
});

describe("placeChordsOnLines", () => {
  const chords: Chord[] = [
    { name: "G", start: 12.4, end: 14.6, confidence: 0.9 },
    { name: "C", start: 14.6, end: 16.8, confidence: 0.8 },
    { name: "D", start: 5.0, end: 6.0, confidence: 0.7 },
  ];

  it("assigns each chord to the line active at its start time", () => {
    const result = placeChordsOnLines(chords, lines);
    expect(result[0].lineIndex).toBe(0);
    expect(result[1].lineIndex).toBe(0);
  });

  it("computes a ratio within [0, 1] for the assigned line", () => {
    const result = placeChordsOnLines(chords, lines);
    expect(result[0].ratio).toBeCloseTo(0, 5);
    expect(result[1].ratio).toBeCloseTo((14.6 - 12.4) / (16.8 - 12.4), 5);
  });

  it("returns null lineIndex/ratio when the chord starts before any line", () => {
    const result = placeChordsOnLines(chords, lines);
    expect(result[2].lineIndex).toBeNull();
    expect(result[2].ratio).toBeNull();
  });
});
