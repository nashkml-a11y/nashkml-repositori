import { describe, expect, it } from "vitest";
import { applyCapo, displayChord, displayToRaw, parseChord, transposeChord } from "../lib/chordUtils";

describe("parseChord", () => {
  it.each([
    ["C", { root: "C", suffix: "" }],
    ["Cm", { root: "C", suffix: "m" }],
    ["C#", { root: "C#", suffix: "" }],
    ["C#m", { root: "C#", suffix: "m" }],
    ["Db", { root: "C#", suffix: "" }],
    ["Bb", { root: "A#", suffix: "" }],
    ["Bbm", { root: "A#", suffix: "m" }],
  ])("parses %s", (name, expected) => {
    expect(parseChord(name)).toEqual(expected);
  });
});

describe("transposeChord", () => {
  it("wraps upward past B to C", () => {
    expect(transposeChord("B", 1)).toBe("C");
  });

  it("wraps downward past C to B", () => {
    expect(transposeChord("C", -1)).toBe("B");
  });

  it("preserves the minor suffix", () => {
    expect(transposeChord("Am", 2)).toBe("Bm");
  });

  it("is the identity for 0 semitones (after normalizing spelling)", () => {
    expect(transposeChord("G", 0)).toBe("G");
  });

  it("passes through the no-chord marker", () => {
    expect(transposeChord("N", 5)).toBe("N");
  });

  it("normalizes flat spelling to sharp", () => {
    expect(transposeChord("Eb", 0)).toBe("D#");
  });
});

describe("applyCapo", () => {
  it("computes the shape for capo 2 on D as C", () => {
    expect(applyCapo("D", 2)).toBe("C");
  });

  it("is the identity for capo 0", () => {
    expect(applyCapo("G", 0)).toBe("G");
  });
});

describe("displayChord", () => {
  it("applies transpose then capo shape", () => {
    expect(displayChord("D", 2, 2)).toBe("D");
  });

  it("is a no-op with default args", () => {
    expect(displayChord("Gm")).toBe("Gm");
  });
});

describe("displayToRaw", () => {
  it("round-trips through displayChord for various transpose/capo combos", () => {
    const cases: Array<[string, number, number]> = [
      ["C", 0, 0],
      ["G", 2, 0],
      ["Am", 0, 3],
      ["D", -2, 2],
      ["F#m", 5, 4],
    ];
    for (const [raw, transpose, capo] of cases) {
      const shown = displayChord(raw, transpose, capo);
      expect(displayToRaw(shown, transpose, capo)).toBe(raw);
    }
  });
});
