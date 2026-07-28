export type SongPhase =
  | "uploaded"
  | "validating"
  | "converting"
  | "separating"
  | "transcribing"
  | "detecting_chords"
  | "smoothing"
  | "syncing"
  | "done"
  | "error";

export const PHASE_ORDER: SongPhase[] = [
  "uploaded",
  "validating",
  "converting",
  "separating",
  "transcribing",
  "detecting_chords",
  "smoothing",
  "syncing",
  "done",
];

export const PHASE_LABELS: Record<SongPhase, string> = {
  uploaded: "Subido",
  validating: "Validando archivo",
  converting: "Convirtiendo audio",
  separating: "Separando voz e instrumentos",
  transcribing: "Transcribiendo letra",
  detecting_chords: "Detectando acordes",
  smoothing: "Suavizando acordes",
  syncing: "Sincronizando letra y acordes",
  done: "Completado",
  error: "Error",
};

export interface Word {
  text: string;
  start: number;
  end: number;
}

export interface LyricLine {
  text: string;
  start: number;
  end: number;
  words: Word[];
}

export interface Chord {
  name: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AnalysisResult {
  key: string | null;
  tempo: number | null;
  capo: number;
  transpose_semitones: number;
  lyrics: LyricLine[];
  chords: Chord[];
  edited: boolean;
}

export interface Song {
  id: string;
  title: string;
  original_filename: string;
  phase: SongPhase;
  error_message: string | null;
  duration: number | null;
  result: AnalysisResult | null;
}

export type ExportFormat = "txt" | "chordpro" | "json";
