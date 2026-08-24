import type { SearchCandidate, SearchResult } from "../api";

interface ResultCardProps {
  result: SearchResult;
  onPickCandidate: (candidate: SearchCandidate) => void;
}

export function ResultCard({ result, onPickCandidate }: ResultCardProps) {
  if (result.status === "ambiguous" && result.candidates) {
    return (
      <div className="w-full rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
        <p className="mb-3 text-base font-medium text-stone-900">{result.answer}</p>
        <div className="flex flex-col gap-2">
          {result.candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPickCandidate(c)}
              className="rounded-2xl bg-stone-50 p-3 text-left transition hover:bg-indigo-50"
            >
              <p className="text-sm font-medium text-stone-900">{c.name}</p>
              <p className="text-xs text-stone-500">
                {c.location_name}
                {c.position_detail ? `, ${c.position_detail}` : ""}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isFound = result.status === "found";

  return (
    <div
      className={`w-full rounded-3xl p-5 text-center shadow-sm ring-1 ${
        isFound ? "bg-indigo-50 ring-indigo-100" : "bg-white ring-stone-100"
      }`}
    >
      <p className={`text-lg font-medium ${isFound ? "text-indigo-900" : "text-stone-500"}`}>
        {result.answer}
      </p>
    </div>
  );
}
