"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { formatVenueAddress, hasCompleteStructuredAddress } from "@/lib/formatAddress";

export function EditAddressForm({
  venueId,
  adresa,
  ulica,
  kucniBroj,
  grad,
}: {
  venueId: string;
  adresa: string;
  ulica: string | null;
  kucniBroj: string | null;
  grad: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ulicaValue, setUlicaValue] = useState(ulica ?? "");
  const [kucniBrojValue, setKucniBrojValue] = useState(kucniBroj ?? "");
  const [gradValue, setGradValue] = useState(grad ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const complete = hasCompleteStructuredAddress({ ulica, kucni_broj: kucniBroj, grad });
  const displayAddress = formatVenueAddress({ adresa, ulica, kucni_broj: kucniBroj, grad });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { ok, error: apiError } = await apiFetch(`/api/venues/${venueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ulica: ulicaValue, kucniBroj: kucniBrojValue, grad: gradValue }),
      });
      if (!ok) {
        setError(apiError ?? "Spremanje adrese nije uspjelo.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <p className="text-sm opacity-70">{displayAddress}</p>
        <button type="button" onClick={() => setOpen(true)} className="text-xs text-slate underline">
          Uredi adresu
        </button>
        {!complete && (
          <p className="text-xs text-alert w-full">
            Adresa nije potpuna — dodajte grad za precizniji naziv datoteke.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-1 flex flex-col gap-2 max-w-md border border-navy/20 rounded p-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-bold mb-1" htmlFor="edit-ulica">
            Ulica
          </label>
          <input
            id="edit-ulica"
            required
            value={ulicaValue}
            onChange={(e) => setUlicaValue(e.target.value)}
            className="w-full border border-navy/30 rounded px-2 py-1.5 bg-transparent text-sm"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-bold mb-1" htmlFor="edit-kucni-broj">
            Kućni broj
          </label>
          <input
            id="edit-kucni-broj"
            required
            value={kucniBrojValue}
            onChange={(e) => setKucniBrojValue(e.target.value)}
            className="w-full border border-navy/30 rounded px-2 py-1.5 bg-transparent text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold mb-1" htmlFor="edit-grad">
          Grad
        </label>
        <input
          id="edit-grad"
          required
          value={gradValue}
          onChange={(e) => setGradValue(e.target.value)}
          className="w-full border border-navy/30 rounded px-2 py-1.5 bg-transparent text-sm"
        />
      </div>

      {error && <p className="text-alert text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary rounded px-3 py-1.5 font-bold text-sm disabled:opacity-50"
        >
          {loading ? "Spremanje..." : "Spremi"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setUlicaValue(ulica ?? "");
            setKucniBrojValue(kucniBroj ?? "");
            setGradValue(grad ?? "");
          }}
          disabled={loading}
          className="rounded px-3 py-1.5 border border-navy/30 font-bold text-sm disabled:opacity-50"
        >
          Odustani
        </button>
      </div>
    </form>
  );
}
