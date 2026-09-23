"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ExchangeState = "exchanging" | "ready" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [exchangeState, setExchangeState] = useState<ExchangeState>("exchanging");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function exchange() {
      try {
        const supabase = createClient();
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type") as EmailOtpType | null;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          setExchangeState(error ? "invalid" : "ready");
          return;
        }
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          setExchangeState(error ? "invalid" : "ready");
          return;
        }
        setExchangeState("invalid");
      } catch {
        setExchangeState("invalid");
      }
    }
    exchange();
    // Namjerno se pokreće samo jednom pri mountanju — code/token_hash se ne mijenjaju.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Lozinka mora imati najmanje 8 znakova.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Lozinke se ne podudaraju.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("Postavljanje nove lozinke nije uspjelo. Pokušajte ponovno.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Došlo je do greške, pokušajte ponovno.");
    } finally {
      setLoading(false);
    }
  }

  if (exchangeState === "exchanging") {
    return <p className="text-sm opacity-70">Provjera poveznice...</p>;
  }

  if (exchangeState === "invalid") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-alert text-sm">
          Poveznica za reset lozinke je nevažeća ili je istekla.
        </p>
        <Link href="/forgot-password" className="text-slate underline text-sm">
          Zatražite novu poveznicu
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <div>
        <label className="block text-sm font-bold mb-1" htmlFor="password">
          Nova lozinka (min. 8 znakova)
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
      <div>
        <label className="block text-sm font-bold mb-1" htmlFor="confirm-password">
          Potvrdite novu lozinku
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        />
      </div>

      {error && <p className="text-alert text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary rounded px-4 py-2 font-bold disabled:opacity-50">
        {loading ? "Spremanje..." : "Postavi novu lozinku"}
      </button>
    </form>
  );
}
