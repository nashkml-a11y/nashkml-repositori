"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type WaveSurferType from "wavesurfer.js";

export interface WaveformPlayerHandle {
  seekTo: (seconds: number) => void;
}

interface Props {
  audioUrl: string;
  onTimeUpdate: (seconds: number) => void;
}

const WaveformPlayer = forwardRef<WaveformPlayerHandle, Props>(function WaveformPlayer(
  { audioUrl, onTimeUpdate },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurferType | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      const ws = waveSurferRef.current;
      if (!ws || !ws.getDuration()) return;
      ws.setTime(seconds);
    },
  }));

  useEffect(() => {
    let disposed = false;
    let ws: WaveSurferType | null = null;

    import("wavesurfer.js").then(({ default: WaveSurfer }) => {
      if (disposed || !containerRef.current) return;
      ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#c7d2fe",
        progressColor: "#4f6df5",
        height: 80,
        cursorColor: "#2f44b8",
        url: audioUrl,
      });
      waveSurferRef.current = ws;

      ws.on("ready", () => setIsReady(true));
      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));
      ws.on("timeupdate", (time: number) => onTimeUpdate(time));
    });

    return () => {
      disposed = true;
      ws?.destroy();
      waveSurferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div ref={containerRef} data-testid="waveform" />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={!isReady}
          onClick={() => waveSurferRef.current?.playPause()}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPlaying ? "Pausar" : "Reproducir"}
        </button>
      </div>
    </div>
  );
});

export default WaveformPlayer;
