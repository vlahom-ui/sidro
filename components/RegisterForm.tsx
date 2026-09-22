"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Turnstile } from "@/components/Turnstile";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!consent) {
      setError("Morate se složiti s Uvjetima korištenja i Politikom privatnosti.");
      return;
    }
    if (!turnstileToken) {
      setError("Molimo pričekajte sigurnosnu provjeru.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken, consent: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registracija nije uspjela.");
        return;
      }

      if (data.requiresEmailConfirmation) {
        setInfo("Registracija uspješna. Provjerite email i potvrdite račun prije prijave.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <div>
        <label className="block text-sm font-bold mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-1" htmlFor="password">
          Lozinka (min. 8 znakova)
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          Slažem se s{" "}
          <a href="/terms" className="text-slate underline">
            Uvjetima korištenja
          </a>{" "}
          i{" "}
          <a href="/privacy" className="text-slate underline">
            Politikom privatnosti
          </a>
          , uključujući pohranu podataka o objektu u svrhu generiranja cjenika i buduće analize.
        </span>
      </label>

      <Turnstile onToken={setTurnstileToken} />

      {error && <p className="text-alert text-sm">{error}</p>}
      {info && <p className="text-sm">{info}</p>}

      <button type="submit" disabled={loading} className="btn-primary rounded px-4 py-2 font-bold disabled:opacity-50">
        {loading ? "Registracija..." : "Registriraj se"}
      </button>
    </form>
  );
}
