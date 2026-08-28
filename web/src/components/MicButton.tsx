interface MicButtonProps {
  isListening: boolean;
  onPress: () => void;
}

export function MicButton({ isListening, onPress }: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={isListening ? "Escuchando..." : "Preguntar por voz"}
      className={`relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full text-white shadow-xl shadow-indigo-900/20 transition-transform active:scale-95 sm:h-48 sm:w-48 ${
        isListening ? "bg-red-500 mic-listening" : "bg-indigo-700"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        className="h-16 w-16 sm:h-20 sm:w-20"
      >
        <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
        <path d="M6 11a6 6 0 0 0 12 0" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" />
        <line x1="8" y1="21" x2="16" y2="21" strokeLinecap="round" />
      </svg>
    </button>
  );
}
