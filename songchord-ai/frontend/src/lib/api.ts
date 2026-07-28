import type { Chord, ExportFormat, LyricLine, Song } from "./types";

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.detail || `Error ${res.status}`;
  } catch {
    return `Error ${res.status}`;
  }
}

export async function uploadSong(file: File): Promise<Song> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/songs", { method: "POST", body: formData });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function analyzeSong(songId: string): Promise<Song> {
  const res = await fetch(`/api/songs/${songId}/analyze`, { method: "POST" });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function getSong(songId: string): Promise<Song> {
  const res = await fetch(`/api/songs/${songId}`);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export interface SongEditPayload {
  lyrics?: LyricLine[];
  chords?: Chord[];
  capo?: number;
  transpose_semitones?: number;
}

export async function updateSong(songId: string, payload: SongEditPayload): Promise<Song> {
  const res = await fetch(`/api/songs/${songId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export function exportUrl(songId: string, format: ExportFormat): string {
  return `/api/songs/${songId}/export?format=${format}`;
}
