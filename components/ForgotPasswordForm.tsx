"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Turnstile } from "@/components/Turnstile";

const GENERIC_MESSAGE = "Ako račun s tom email adresom postoji, poslali smo link za reset lozinke.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!turnstileToken) {
      setError("Molimo pričekajte sigurnosnu provjeru.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      // Namjerno se ne razlikuje ponašanje ako email ne postoji — Supabase
      // svejedno vraća uspjeh (bez slanja maila) da se ne otkriva postojanje
      // računa na ovoj javno dostupnoj, neprijavljenoj formi.
      await supabase.auth.resetPasswordForEmail(email, {
        captchaToken: turnstileToken,
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
      });
      setSubmitted(true);
    } catch {
      setError("Nešto je pošlo po zlu. Pokušajte ponovno.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return <p className="text-sm max-w-sm">{GENERIC_MESSAGE}</p>;
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

      <Turnstile onToken={setTurnstileToken} />

      {error && <p className="text-alert text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary rounded px-4 py-2 font-bold disabled:opacity-50">
        {loading ? "Slanje..." : "Pošalji link za reset"}
      </button>
    </form>
  );
}
