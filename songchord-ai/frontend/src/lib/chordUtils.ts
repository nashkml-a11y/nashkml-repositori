const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const ENHARMONIC_FLATS: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};
const NO_CHORD = "N";

export function parseChord(name: string): { root: string; suffix: string } {
  if (!name || name === NO_CHORD) {
    return { root: name, suffix: "" };
  }
  let root = name[0].toUpperCase();
  let idx = 1;
  if (idx < name.length && (name[idx] === "#" || name[idx] === "b")) {
    root += name[idx];
    idx += 1;
  }
  const suffix = name.slice(idx);
  root = ENHARMONIC_FLATS[root] ?? root;
  return { root, suffix };
}

export function transposeChord(name: string, semitones: number): string {
  if (!name || name === NO_CHORD) {
    return name;
  }
  const { root, suffix } = parseChord(name);
  const rootIndex = NOTES.indexOf(root);
  if (rootIndex === -1) {
    return name;
  }
  const idx = (((rootIndex + semitones) % 12) + 12) % 12;
  return NOTES[idx] + suffix;
}

export function applyCapo(name: string, capo: number): string {
  return transposeChord(name, -capo);
}

export function displayChord(name: string, transposeSemitones = 0, capo = 0): string {
  const transposed = transposeChord(name, transposeSemitones);
  return applyCapo(transposed, capo);
}

/** Inverse of displayChord: recovers the raw stored chord name from what is
 * shown on screen, so editing the displayed chord updates the right value. */
export function displayToRaw(displayName: string, transposeSemitones = 0, capo = 0): string {
  const withoutCapo = transposeChord(displayName, capo);
  return transposeChord(withoutCapo, -transposeSemitones);
}
