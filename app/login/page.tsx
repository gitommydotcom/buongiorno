"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, from }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Password errata");
      return;
    }
    const data = await res.json();
    router.push(data.from || "/");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="font-serif text-3xl font-semibold">Buongiorno</h1>
      <p className="mt-1 text-sm text-muted">App privata. Inserisci la password per continuare.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          placeholder="password"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="tap w-full rounded-xl bg-fg py-3 font-medium text-bg disabled:opacity-50"
        >
          {loading ? "Accesso…" : "Entra"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
