"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogin() {
  const router = useRouter();
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
        body: JSON.stringify({ password }),
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
    <form onSubmit={submit} className="surface mx-auto max-w-sm p-5">
      <label className="label mb-2 block" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        autoFocus
        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        style={{ borderColor: "var(--border)", background: "var(--bg-input)", color: "var(--text)" }}
      />

      {error ? (
        <p className="mt-3 text-sm" style={{ color: "var(--color-flag)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !password}
        className="label mt-4 w-full rounded-full px-4 py-3 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--on-accent)" }}
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
