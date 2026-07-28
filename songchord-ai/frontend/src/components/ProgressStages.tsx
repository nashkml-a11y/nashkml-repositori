import { PHASE_LABELS, PHASE_ORDER, type SongPhase } from "@/lib/types";

interface Props {
  phase: SongPhase;
  errorMessage: string | null;
}

export default function ProgressStages({ phase, errorMessage }: Props) {
  if (phase === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-medium">El análisis falló.</p>
        {errorMessage && <p className="mt-1 text-sm">{errorMessage}</p>}
      </div>
    );
  }

  const currentIndex = PHASE_ORDER.indexOf(phase);

  return (
    <div className="space-y-2">
      {PHASE_ORDER.map((stage, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "pending";
        return (
          <div key={stage} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                state === "done"
                  ? "bg-brand-500 text-white"
                  : state === "active"
                    ? "animate-pulse bg-brand-600 text-white"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={`text-sm ${state === "pending" ? "text-slate-400" : "font-medium text-slate-800"}`}
            >
              {PHASE_LABELS[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
