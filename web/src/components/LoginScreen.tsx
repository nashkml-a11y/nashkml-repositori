import { useState } from "react";
import { api } from "../api";

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await api.login(password);
      onSuccess();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6">
      <h1 className="text-center text-2xl font-semibold text-stone-900">Buscador de objetos</h1>
      <p className="mt-2 text-center text-sm text-stone-500">Introduce la contraseña para entrar.</p>
      <form onSubmit={handleSubmit} className="mt-8 flex w-full flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoFocus
          className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-base text-stone-900 focus:border-indigo-400 focus:outline-none"
        />
        {errorMsg && <p className="text-center text-sm text-red-500">{errorMsg}</p>}
        <button
          type="submit"
          disabled={!password || loading}
          className="rounded-2xl bg-indigo-700 py-3 text-base font-medium text-white disabled:opacity-40"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
