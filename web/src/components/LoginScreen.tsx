import { useState } from "react";
import { api } from "../api";

interface LoginScreenProps {
  onSuccess: () => void;
}

type Mode = "login" | "register";

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || (mode === "register" && !code)) return;
    setLoading(true);
    setErrorMsg("");
    try {
      if (mode === "login") {
        await api.login(email, password);
      } else {
        await api.register(email, password, code, displayName.trim() || undefined);
      }
      onSuccess();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo continuar");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setErrorMsg("");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6">
      <h1 className="text-center text-2xl font-semibold text-stone-900">M.A.P.A.</h1>
      <p className="mt-1 text-center text-xs text-stone-400">
        Memoria Asistida de Posición y Almacenamiento
      </p>
      <p className="mt-3 text-center text-sm text-stone-500">
        {mode === "login" ? "Entra con tu cuenta." : "Crea tu cuenta para empezar."}
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex w-full flex-col gap-3">
        {mode === "register" && (
          <>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre (opcional)"
              className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-base text-stone-900 focus:border-indigo-400 focus:outline-none"
            />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de invitación"
              className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-base text-stone-900 focus:border-indigo-400 focus:outline-none"
            />
          </>
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoFocus
          autoComplete="email"
          className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-base text-stone-900 focus:border-indigo-400 focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-base text-stone-900 focus:border-indigo-400 focus:outline-none"
        />
        {errorMsg && <p className="text-center text-sm text-red-500">{errorMsg}</p>}
        <button
          type="submit"
          disabled={!email || !password || (mode === "register" && !code) || loading}
          className="rounded-2xl bg-indigo-700 py-3 text-base font-medium text-white disabled:opacity-40"
        >
          {loading ? "Un momento..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => switchMode(mode === "login" ? "register" : "login")}
        className="mt-4 text-sm text-stone-500"
      >
        {mode === "login" ? "¿No tienes cuenta? Crea una" : "¿Ya tienes cuenta? Entra"}
      </button>
    </div>
  );
}
