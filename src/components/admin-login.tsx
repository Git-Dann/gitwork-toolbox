"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogin({ names }: { names: string[] }) {
  const router = useRouter();
  const [name, setName] = useState(names[0] ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Could not sign in.");
      else router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="surface mx-auto max-w-sm p-6">
      <p className="label mb-4">Who is this?</p>
      <div className="flex gap-2">
        {names.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setName(option)}
            className="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors"
            style={
              name === option
                ? { borderColor: "var(--accent)", background: "var(--accent)", color: "var(--on-accent)" }
                : { borderColor: "var(--border)", color: "var(--text-soft)" }
            }
          >
            {option}
          </button>
        ))}
      </div>

      <label className="label mb-2 mt-6 block" htmlFor="password">
        Shared password
      </label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        style={{ borderColor: "var(--border)", background: "var(--bg-input)", color: "var(--text)" }}
      />

      {error ? <p className="mt-3 text-sm" style={{ color: "var(--color-flag)" }}>{error}</p> : null}

      <button
        type="submit"
        disabled={busy || !password}
        className="label mt-5 w-full rounded-full px-4 py-3 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--on-accent)" }}
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
