"use client";

import { useState } from "react";
import { displayChord, displayToRaw } from "@/lib/chordUtils";
import { activeLineIndex, placeChordsOnLines } from "@/lib/sync";
import type { Chord, LyricLine } from "@/lib/types";

interface Props {
  lyrics: LyricLine[];
  chords: Chord[];
  transposeSemitones: number;
  capo: number;
  currentTime: number;
  onLyricsChange: (lyrics: LyricLine[]) => void;
  onChordsChange: (chords: Chord[]) => void;
  onSeek: (seconds: number) => void;
}

export default function SyncedEditor({
  lyrics,
  chords,
  transposeSemitones,
  capo,
  currentTime,
  onLyricsChange,
  onChordsChange,
  onSeek,
}: Props) {
  const [editingChordIndex, setEditingChordIndex] = useState<number | null>(null);

  const activeLine = activeLineIndex(lyrics, currentTime);
  const placements = placeChordsOnLines(chords, lyrics);

  function updateLineText(lineIndex: number, text: string) {
    const next = lyrics.map((line, i) => (i === lineIndex ? { ...line, text } : line));
    onLyricsChange(next);
  }

  function renameChord(chordIndex: number, displayName: string) {
    const raw = displayToRaw(displayName, transposeSemitones, capo);
    const next = chords.map((c, i) => (i === chordIndex ? { ...c, name: raw } : c));
    onChordsChange(next);
  }

  function deleteChord(chordIndex: number) {
    onChordsChange(chords.filter((_, i) => i !== chordIndex));
    setEditingChordIndex(null);
  }

  function retimeChord(chordIndex: number, field: "start" | "end", value: number) {
    const next = chords.map((c, i) => (i === chordIndex ? { ...c, [field]: value } : c));
    onChordsChange(next);
  }

  return (
    <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4">
      {lyrics.length === 0 && (
        <p className="text-sm text-slate-500">No se detectó letra (posible instrumental).</p>
      )}
      {lyrics.map((line, lineIndex) => {
        const lineChords = placements.filter((p) => p.lineIndex === lineIndex);
        return (
          <div
            key={lineIndex}
            className={`rounded-lg px-2 pb-1 pt-6 transition-colors ${
              activeLine === lineIndex ? "bg-brand-50" : ""
            }`}
          >
            <div className="relative h-6">
              {lineChords.map((p) => (
                <div
                  key={p.chordIndex}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${(p.ratio ?? 0) * 100}%` }}
                >
                  {editingChordIndex === p.chordIndex ? (
                    <div className="flex items-center gap-1 rounded-md border border-brand-500 bg-white p-1 shadow-md">
                      <input
                        autoFocus
                        className="w-14 rounded border border-slate-300 px-1 text-xs"
                        defaultValue={displayChord(p.chord.name, transposeSemitones, capo)}
                        onBlur={(e) => {
                          renameChord(p.chordIndex, e.target.value.trim());
                          setEditingChordIndex(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                      />
                      <input
                        type="number"
                        step="0.1"
                        className="w-14 rounded border border-slate-300 px-1 text-xs"
                        defaultValue={p.chord.start}
                        onBlur={(e) => retimeChord(p.chordIndex, "start", Number(e.target.value))}
                        title="Inicio (s)"
                      />
                      <button
                        type="button"
                        className="rounded bg-red-100 px-1.5 text-xs text-red-700"
                        onClick={() => deleteChord(p.chordIndex)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingChordIndex(p.chordIndex)}
                      className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-200"
                      title={`Confianza: ${Math.round(p.chord.confidence * 100)}%`}
                    >
                      {displayChord(p.chord.name, transposeSemitones, capo)}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <input
              value={line.text}
              onChange={(e) => updateLineText(lineIndex, e.target.value)}
              onFocus={() => onSeek(line.start)}
              className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-lg focus:border-slate-300 focus:bg-slate-50"
            />
          </div>
        );
      })}
    </div>
  );
}
