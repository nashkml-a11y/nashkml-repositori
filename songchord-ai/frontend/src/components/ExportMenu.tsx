import { exportUrl } from "@/lib/api";
import type { ExportFormat } from "@/lib/types";

interface Props {
  songId: string;
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "txt", label: "TXT" },
  { value: "chordpro", label: "ChordPro" },
  { value: "json", label: "JSON" },
];

export default function ExportMenu({ songId }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-700">Exportar:</span>
      {FORMATS.map((format) => (
        <a
          key={format.value}
          href={exportUrl(songId, format.value)}
          download
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          {format.label}
        </a>
      ))}
    </div>
  );
}
