"use client";

import { useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = [".mp3", ".wav", ".m4a"];

interface Props {
  selectedFile: File | null;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export default function UploadDropzone({ selectedFile, onFileSelected, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!isAcceptedFile(file)) {
      setError("Formato no soportado. Usa MP3, WAV o M4A.");
      return;
    }
    setError(null);
    onFileSelected(file);
  }

  return (
    <div>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-brand-500"}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-brand-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5L12 3m0 0L7.5 7.5M12 3v13.5"
          />
        </svg>
        <p className="font-medium text-slate-700">
          {selectedFile ? selectedFile.name : "Arrastra tu canción aquí o haz clic para elegirla"}
        </p>
        <p className="text-sm text-slate-500">Formatos soportados: MP3, WAV, M4A</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
