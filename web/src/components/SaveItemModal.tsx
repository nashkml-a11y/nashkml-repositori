import { useState } from "react";
import { Modal } from "./Modal";
import { api, type ExtractionPreview } from "../api";
import { useSpeechRecognition, isSpeechRecognitionSupported } from "../useSpeechRecognition";
import { compressImageToDataUrl } from "../image";

interface SaveItemModalProps {
  onClose: () => void;
  onSaved: () => void;
}

type Stage = "input" | "loading" | "confirm" | "saving" | "error";

export function SaveItemModal({ onClose, onSaved }: SaveItemModalProps) {
  const [stage, setStage] = useState<Stage>("input");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ExtractionPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");

  const { isListening, start, error: speechError } = useSpeechRecognition((transcript) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
  });

  async function handleExtract() {
    if (!text.trim()) return;
    setStage("loading");
    try {
      const result = await api.extractItem(text.trim());
      setPreview(result);
      setStage("confirm");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Algo ha fallado");
      setStage("error");
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setStage("saving");
    try {
      await api.confirmItem(preview, photo);
      onSaved();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Algo ha fallado");
      setStage("error");
    }
  }

  async function handlePhotoSelected(file: File | undefined) {
    if (!file) return;
    setPhotoError("");
    try {
      setPhoto(await compressImageToDataUrl(file));
    } catch {
      setPhotoError("No se pudo procesar la foto. Inténtalo de nuevo.");
    }
  }

  return (
    <Modal title="Guardar objeto" onClose={onClose}>
      {(stage === "input" || stage === "loading" || stage === "error") && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-500">
            Describe con tus palabras qué has guardado y dónde. Por ejemplo: «Las llaves del
            coche están en el cajón del recibidor número 2».
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Escribe o dicta aquí..."
            className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 p-4 text-base text-stone-900 focus:border-indigo-400 focus:outline-none"
          />
          {speechError && <p className="text-sm text-red-500">{speechError}</p>}
          <div className="flex items-center gap-3">
            {isSpeechRecognitionSupported && (
              <button
                type="button"
                onClick={start}
                aria-label="Dictar"
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  isListening ? "bg-red-500" : "bg-stone-100"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isListening ? "white" : "#57534e"}
                  strokeWidth={1.8}
                  className="h-6 w-6"
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" fill={isListening ? "white" : "#57534e"} stroke="none" />
                  <path d="M6 11a6 6 0 0 0 12 0" strokeLinecap="round" />
                  <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={handleExtract}
              disabled={!text.trim() || stage === "loading"}
              className="flex-1 rounded-2xl bg-indigo-700 py-3 text-base font-medium text-white disabled:opacity-40"
            >
              {stage === "loading" ? "Entendiendo..." : "Continuar"}
            </button>
          </div>
          {stage === "error" && <p className="text-sm text-red-500">{errorMsg}</p>}
        </div>
      )}

      {(stage === "confirm" || stage === "saving") && preview && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-stone-50 p-4">
            <ConfirmRow label="Objeto" value={preview.object_name} />
            {preview.object_description && (
              <ConfirmRow label="Descripción" value={preview.object_description} />
            )}
            <ConfirmRow
              label="Ubicación"
              value={`${preview.location_name}${preview.location_is_new ? " (nueva)" : ""}`}
            />
            {preview.position_detail && <ConfirmRow label="Posición" value={preview.position_detail} />}
            {preview.is_location_update && (
              <p className="mt-2 text-sm text-indigo-700">
                Este objeto ya existía: se actualizará su ubicación.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {photo ? (
              <img src={photo} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
                  <rect x="3" y="6" width="18" height="14" rx="2" />
                  <circle cx="12" cy="13" r="3.5" />
                  <path d="M9 6l1-2h4l1 2" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoSelected(e.target.files?.[0])}
                />
              </label>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-stone-500">
                {photo ? "Foto añadida" : "Añadir foto (opcional)"}
              </span>
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="self-start text-xs font-medium text-red-500"
                >
                  Quitar foto
                </button>
              )}
              {photoError && <p className="text-xs text-red-500">{photoError}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={stage === "saving"}
              className="flex-1 rounded-2xl bg-stone-100 py-3 text-base font-medium text-stone-700 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={stage === "saving"}
              className="flex-1 rounded-2xl bg-indigo-700 py-3 text-base font-medium text-white disabled:opacity-40"
            >
              {stage === "saving" ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="text-right font-medium text-stone-900">{value}</span>
    </div>
  );
}
