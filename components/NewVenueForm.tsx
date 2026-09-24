"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { Database, ItemTip } from "@/lib/database.types";
import { VenuePodkategorijaCombobox } from "./VenuePodkategorijaCombobox";

type Venue = Database["public"]["Tables"]["venues"]["Row"];
type VenueKategorija = Database["public"]["Tables"]["venue_kategorije"]["Row"];
type VenuePodkategorija = Database["public"]["Tables"]["venue_podkategorije"]["Row"];

export function NewVenueForm({
  kategorije,
  podkategorije,
}: {
  kategorije: VenueKategorija[];
  podkategorije: VenuePodkategorija[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [naziv, setNaziv] = useState("");
  const [podkategorijaId, setPodkategorijaId] = useState<string | null>(null);
  const [adresa, setAdresa] = useState("");
  const [oib, setOib] = useState("");
  const [defaultTip, setDefaultTip] = useState<ItemTip>("usluga");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!podkategorijaId) {
      setError("Odaberite kategoriju objekta.");
      return;
    }

    setLoading(true);

    try {
      const { ok, data, error: apiError } = await apiFetch<{ venue: Venue }>("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naziv, podkategorijaId, adresa, oib: oib || null, defaultTip }),
      });

      if (!ok || !data) {
        setError(apiError ?? "Greška.");
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
          Kategorija objekta
        </label>
        <VenuePodkategorijaCombobox
          kategorije={kategorije}
          podkategorije={podkategorije}
          value={podkategorijaId}
          onChange={setPodkategorijaId}
        />
        <p className="text-xs opacity-60 mt-1">
          Interna kategorizacija radi organizacije — ne službeni šifrarnik (npr. NKD).
        </p>
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
      <div>
        <span className="block text-sm font-bold mb-1">Pretežno prodajete</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              checked={defaultTip === "proizvod"}
              onChange={() => setDefaultTip("proizvod")}
            />
            Proizvode
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              checked={defaultTip === "usluga"}
              onChange={() => setDefaultTip("usluga")}
            />
            Usluge
          </label>
        </div>
        <p className="text-xs opacity-60 mt-1">
          Ovo je samo default za nove stavke — objekt i dalje može imati oboje, a tip svake
          stavke uvijek možete promijeniti pojedinačno ili bulk-akcijom.
        </p>
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
