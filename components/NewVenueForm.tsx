"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const OBLICI_OBJEKTA = [
  "restoran",
  "kafić",
  "trgovina",
  "frizerski salon",
  "kozmetički salon",
  "obrt",
  "ostalo",
];

export function NewVenueForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [naziv, setNaziv] = useState("");
  const [oblikObjekta, setOblikObjekta] = useState(OBLICI_OBJEKTA[0]);
  const [adresa, setAdresa] = useState("");
  const [oib, setOib] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naziv, oblikObjekta, adresa, oib: oib || null }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Greška.");
        return;
      }

      router.push(`/dashboard/${data.venue.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary rounded px-4 py-2 font-bold">
        + Novi objekt
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md border border-navy/20 rounded p-4">
      <div>
        <label className="block text-sm font-bold mb-1" htmlFor="naziv">
          Naziv objekta
        </label>
        <input
          id="naziv"
          required
          value={naziv}
          onChange={(e) => setNaziv(e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-1" htmlFor="oblik">
          Oblik objekta
        </label>
        <select
          id="oblik"
          value={oblikObjekta}
          onChange={(e) => setOblikObjekta(e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        >
          {OBLICI_OBJEKTA.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold mb-1" htmlFor="adresa">
          Adresa
        </label>
        <input
          id="adresa"
          required
          value={adresa}
          onChange={(e) => setAdresa(e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-1" htmlFor="oib">
          OIB (opcionalno)
        </label>
        <input
          id="oib"
          value={oib}
          onChange={(e) => setOib(e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        />
      </div>

      {error && <p className="text-alert text-sm">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary rounded px-4 py-2 font-bold disabled:opacity-50">
          {loading ? "Spremanje..." : "Stvori objekt"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded px-4 py-2 border border-navy/30">
          Odustani
        </button>
      </div>
    </form>
  );
}
