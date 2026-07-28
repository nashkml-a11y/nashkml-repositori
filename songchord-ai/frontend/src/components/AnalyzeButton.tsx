interface Props {
  disabled: boolean;
  isAnalyzing: boolean;
  onClick: () => void;
}

export default function AnalyzeButton({ disabled, isAnalyzing, onClick }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {isAnalyzing ? "Analizando…" : "Analizar canción"}
    </button>
  );
}
