"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/apiFetch";

export function DeleteAccountForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const confirmed = confirm(
      "Ovo će trajno obrisati vaš račun, sve vaše objekte, cjenike i stavke. Radnja se NE MOŽE poništiti. Nastaviti?"
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const { ok, error: apiError } = await apiFetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!ok) {
        setError(apiError ?? "Brisanje računa nije uspjelo.");
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/?racun-obrisan=1");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-alert underline text-sm">
        Obriši moj račun
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm border border-alert/40 rounded p-4">
      <p className="text-sm font-bold text-alert">
        Nepovratno brisanje računa i svih vaših objekata, cjenika i stavki.
      </p>
      <div>
        <label className="block text-sm font-bold mb-1" htmlFor="delete-account-password">
          Upišite lozinku za potvrdu
        </label>
        <input
          id="delete-account-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        />
      </div>

      {error && <p className="text-alert text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn-alert rounded px-4 py-2 font-bold disabled:opacity-50"
        >
          {loading ? "Brisanje..." : "Trajno obriši račun"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPassword("");
            setError(null);
          }}
          disabled={loading}
          className="rounded px-4 py-2 border border-navy/30 font-bold disabled:opacity-50"
        >
          Odustani
        </button>
      </div>
    </form>
  );
}
