"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não foi possível entrar.");
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Sem conexão. Tente de novo.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="pw">Senha</label>
        <input
          id="pw"
          className="input"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Digite sua senha"
        />
      </div>
      {error && <div className="error-text">{error}</div>}
      <button className="btn btn-block" style={{ marginTop: 18 }} disabled={busy || !password}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
