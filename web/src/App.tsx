import { useEffect, useState } from "react";
import { MicButton } from "./components/MicButton";
import { ResultCard } from "./components/ResultCard";
import { SaveItemModal } from "./components/SaveItemModal";
import { LocationsModal } from "./components/LocationsModal";
import { LoginScreen } from "./components/LoginScreen";
import { useSpeechRecognition, isSpeechRecognitionSupported } from "./useSpeechRecognition";
import { api, type SearchCandidate, type SearchResult } from "./api";
import { getToken } from "./auth";
import { speak } from "./speak";

type ModalKind = "save-item" | "locations" | null;

function App() {
  const [authenticated, setAuthenticated] = useState(() => getToken() !== null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [openModal, setOpenModal] = useState<ModalKind>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setSearching(true);
    setSavedNotice(false);
    try {
      const res = await api.search(trimmed);
      setResult(res);
      if (res.status !== "ambiguous") speak(res.answer);
    } catch {
      const errorResult: SearchResult = {
        status: "error",
        answer: "No he podido buscar ahora mismo. Comprueba tu conexión e inténtalo de nuevo.",
      };
      setResult(errorResult);
      speak(errorResult.answer);
    } finally {
      setSearching(false);
    }
  }

  const { isListening, start, error: speechError } = useSpeechRecognition((transcript) => {
    setQuery(transcript);
    runSearch(transcript);
  });

  async function handlePickCandidate(candidate: SearchCandidate) {
    setSearching(true);
    try {
      const res = await api.searchItem(candidate.id);
      setResult(res);
      speak(res.answer);
    } finally {
      setSearching(false);
    }
  }

  function handleItemSaved() {
    setOpenModal(null);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3500);
  }

  useEffect(() => {
    const handleExpired = () => setAuthenticated(false);
    window.addEventListener("auth-expired", handleExpired);
    return () => window.removeEventListener("auth-expired", handleExpired);
  }, []);

  if (!authenticated) {
    return <LoginScreen onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 pb-10 pt-12 sm:pt-16">
      <h1 className="text-center text-2xl font-semibold text-stone-900 sm:text-3xl">
        ¿Qué estás buscando?
      </h1>

      <div className="mt-8 flex flex-col items-center gap-3">
        <MicButton isListening={isListening} onPress={start} />
        {!isSpeechRecognitionSupported && (
          <p className="max-w-xs text-center text-xs text-stone-400">
            Este dispositivo no admite búsqueda por voz. Usa el campo de texto.
          </p>
        )}
        {speechError && <p className="max-w-xs text-center text-sm text-red-500">{speechError}</p>}
      </div>

      <form
        className="mt-8 w-full"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
      >
        <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-stone-200 focus-within:ring-indigo-400">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe qué buscas..."
            className="flex-1 bg-transparent px-3 py-2 text-base text-stone-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Buscar
          </button>
        </div>
      </form>

      <div className="mt-6 w-full min-h-[4.5rem]">
        {searching && <p className="text-center text-sm text-stone-400">Buscando...</p>}
        {!searching && result && (
          <ResultCard result={result} onPickCandidate={handlePickCandidate} />
        )}
      </div>

      {savedNotice && (
        <p className="mt-2 text-center text-sm font-medium text-emerald-600">Objeto guardado.</p>
      )}

      <div className="mt-auto flex w-full flex-col gap-2 pt-10">
        <button
          type="button"
          onClick={() => setOpenModal("save-item")}
          className="rounded-2xl bg-stone-100 py-3 text-sm font-medium text-stone-700"
        >
          + Guardar objeto
        </button>
        <button
          type="button"
          onClick={() => setOpenModal("locations")}
          className="rounded-2xl bg-stone-100 py-3 text-sm font-medium text-stone-700"
        >
          + Nueva ubicación
        </button>
      </div>

      {openModal === "save-item" && (
        <SaveItemModal onClose={() => setOpenModal(null)} onSaved={handleItemSaved} />
      )}
      {openModal === "locations" && (
        <LocationsModal onClose={() => setOpenModal(null)} onChanged={() => {}} />
      )}
    </div>
  );
}

export default App;
