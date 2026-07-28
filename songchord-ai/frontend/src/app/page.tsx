"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeSong, getSong, updateSong, uploadSong } from "@/lib/api";
import type { Chord, LyricLine, Song } from "@/lib/types";
import AnalyzeButton from "@/components/AnalyzeButton";
import ExportMenu from "@/components/ExportMenu";
import ProgressStages from "@/components/ProgressStages";
import SyncedEditor from "@/components/SyncedEditor";
import TransposeCapoControls from "@/components/TransposeCapoControls";
import UploadDropzone from "@/components/UploadDropzone";
import WaveformPlayer, { type WaveformPlayerHandle } from "@/components/WaveformPlayer";

const POLL_INTERVAL_MS = 2000;

function setSongIdInUrl(songId: string | null) {
  const url = new URL(window.location.href);
  if (songId) {
    url.searchParams.set("songId", songId);
  } else {
    url.searchParams.delete("songId");
  }
  window.history.replaceState(null, "", url.toString());
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [chords, setChords] = useState<Chord[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const waveformRef = useRef<WaveformPlayerHandle>(null);

  const isProcessing = song !== null && song.phase !== "done" && song.phase !== "error";
  const isDone = song?.phase === "done" && song.result;

  // Deep-link support: reloading a URL with ?songId=... restores that song
  // instead of dropping the user back to the empty upload screen.
  useEffect(() => {
    const songId = new URLSearchParams(window.location.search).get("songId");
    if (!songId) return;
    getSong(songId)
      .then(setSong)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isProcessing || !song) return;
    const interval = setInterval(async () => {
      try {
        const updated = await getSong(song.id);
        setSong(updated);
      } catch {
        // transient polling error; retry on next tick
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isProcessing, song]);

  useEffect(() => {
    if (song?.phase === "done" && song.result) {
      setLyrics(song.result.lyrics);
      setChords(song.result.chords);
    }
  }, [song?.phase, song?.result]);

  async function handleAnalyzeClick() {
    setError(null);
    setIsStarting(true);
    try {
      // One button does both steps: upload the file (if not already
      // uploaded) and immediately kick off the analysis pipeline.
      let current = song;
      if (!current) {
        if (!file) return;
        current = await uploadSong(file);
        setSong(current);
        setSongIdInUrl(current.id);
      }
      const started = await analyzeSong(current.id);
      setSong(started);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar la canción.");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSave() {
    if (!song || !song.result) return;
    setSaveStatus("saving");
    try {
      const updated = await updateSong(song.id, {
        lyrics,
        chords,
        capo: song.result.capo,
        transpose_semitones: song.result.transpose_semitones,
      });
      setSong(updated);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
      setSaveStatus("idle");
    }
  }

  function handleReset() {
    setFile(null);
    setSong(null);
    setLyrics([]);
    setChords([]);
    setError(null);
    setSongIdInUrl(null);
  }

  const handleTransposeChange = useCallback(
    async (value: number) => {
      if (!song) return;
      const updated = await updateSong(song.id, { transpose_semitones: value });
      setSong(updated);
    },
    [song],
  );

  const handleCapoChange = useCallback(
    async (value: number) => {
      if (!song) return;
      const updated = await updateSong(song.id, { capo: value });
      setSong(updated);
    },
    [song],
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">SongChord AI</h1>
        <p className="mt-1 text-slate-600">
          Sube una canción y obtén letra sincronizada, acordes y tonalidad automáticamente.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {!isDone && (
          <>
            <UploadDropzone
              selectedFile={file}
              onFileSelected={setFile}
              disabled={isStarting || isProcessing}
            />

            <div className="flex justify-center">
              <AnalyzeButton
                disabled={(!file && !song) || isStarting || isProcessing}
                isAnalyzing={isStarting || isProcessing}
                onClick={handleAnalyzeClick}
              />
            </div>
          </>
        )}

        {song && song.phase !== "done" && (
          <ProgressStages phase={song.phase} errorMessage={song.error_message} />
        )}

        {isDone && song?.result && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-700">
                <span className="font-semibold">Tonalidad:</span> {song.result.key ?? "—"}{" "}
                &nbsp;
                <span className="font-semibold">Tempo:</span>{" "}
                {song.result.tempo ? `${Math.round(song.result.tempo)} BPM` : "—"}
                &nbsp;
                <span className="font-semibold">Duración:</span>{" "}
                {song.duration ? `${Math.round(song.duration)}s` : "—"}
              </div>
              <div className="flex items-center gap-3">
                <ExportMenu songId={song.id} />
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm font-medium text-slate-500 underline hover:text-slate-700"
                >
                  Nueva canción
                </button>
              </div>
            </div>

            <WaveformPlayer
              ref={waveformRef}
              audioUrl={`/api/songs/${song.id}/audio`}
              onTimeUpdate={setCurrentTime}
            />

            <TransposeCapoControls
              transposeSemitones={song.result.transpose_semitones}
              capo={song.result.capo}
              onTransposeChange={handleTransposeChange}
              onCapoChange={handleCapoChange}
            />

            <SyncedEditor
              lyrics={lyrics}
              chords={chords}
              transposeSemitones={song.result.transpose_semitones}
              capo={song.result.capo}
              currentTime={currentTime}
              onLyricsChange={setLyrics}
              onChordsChange={setChords}
              onSeek={(seconds) => waveformRef.current?.seekTo(seconds)}
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-900"
              >
                {saveStatus === "saving"
                  ? "Guardando…"
                  : saveStatus === "saved"
                    ? "Guardado ✓"
                    : "Guardar cambios"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
