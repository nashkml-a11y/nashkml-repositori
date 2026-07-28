interface Props {
  transposeSemitones: number;
  capo: number;
  onTransposeChange: (value: number) => void;
  onCapoChange: (value: number) => void;
}

const CAPO_OPTIONS = Array.from({ length: 8 }, (_, i) => i); // 0..7

export default function TransposeCapoControls({
  transposeSemitones,
  capo,
  onTransposeChange,
  onCapoChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Transponer</span>
        <button
          type="button"
          aria-label="Bajar semitono"
          onClick={() => onTransposeChange(transposeSemitones - 1)}
          className="h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          -
        </button>
        <span className="w-10 text-center text-sm tabular-nums">
          {transposeSemitones > 0 ? `+${transposeSemitones}` : transposeSemitones}
        </span>
        <button
          type="button"
          aria-label="Subir semitono"
          onClick={() => onTransposeChange(transposeSemitones + 1)}
          className="h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          +
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="capo-select" className="text-sm font-medium text-slate-700">
          Capo
        </label>
        <select
          id="capo-select"
          value={capo}
          onChange={(e) => onCapoChange(Number(e.target.value))}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          {CAPO_OPTIONS.map((fret) => (
            <option key={fret} value={fret}>
              {fret === 0 ? "Sin capo" : `Traste ${fret}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
