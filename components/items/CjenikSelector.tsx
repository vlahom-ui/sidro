"use client";

import { useState } from "react";
import type { Database } from "@/lib/database.types";
import { apiFetch } from "@/lib/apiFetch";
import { KategorijaCombobox } from "@/components/KategorijaCombobox";

type Cjenik = Database["public"]["Tables"]["cjenici"]["Row"];
type Kategorija = Database["public"]["Tables"]["kategorije"]["Row"];
type Podkategorija = Database["public"]["Tables"]["podkategorije"]["Row"];

function kategorijaLabel(
  cjenik: Cjenik | undefined,
  kategorije: Kategorija[],
  podkategorije: Podkategorija[]
): string | null {
  if (!cjenik?.podkategorija_id) return null;
  const podkategorija = podkategorije.find((p) => p.id === cjenik.podkategorija_id);
  if (!podkategorija) return null;
  const kategorija = kategorije.find((k) => k.id === podkategorija.kategorija_id);
  if (!kategorija) return null;
  return `${kategorija.naziv}: ${podkategorija.naziv}`;
}

export function CjenikSelector({
  venueId,
  cjenici,
  kategorije,
  podkategorije,
  selectedCjenikId,
  itemCounts,
  ungroupedItemCount = 0,
  onSelect,
  onCreated,
}: {
  venueId: string;
  cjenici: Cjenik[];
  kategorije: Kategorija[];
  podkategorije: Podkategorija[];
  selectedCjenikId: string | null;
  itemCounts: Record<string, number>;
  ungroupedItemCount?: number;
  onSelect: (cjenikId: string | null) => void;
  onCreated: (cjenik: Cjenik) => void;
}) {
  const [creating, setCreating] = useState(cjenici.length === 0);
  const [naziv, setNaziv] = useState(cjenici.length === 0 ? "Glavni cjenik" : "");
  const [podkategorijaId, setPodkategorijaId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!naziv.trim()) {
      setError("Naziv cjenika je obavezan.");
      return;
    }
    setSaving(true);
    try {
      const { ok, data, error: apiError } = await apiFetch<{ cjenik: Cjenik }>(
        `/api/venues/${venueId}/cjenici`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ naziv: naziv.trim(), podkategorijaId }),
        }
      );
      if (!ok || !data) {
        setError(apiError ?? "Stvaranje cjenika nije uspjelo.");
        return;
      }
      onCreated(data.cjenik);
      onSelect(data.cjenik.id);
      setCreating(false);
      setNaziv("");
      setPodkategorijaId(null);
    } finally {
      setSaving(false);
    }
  }

  if (cjenici.length === 0 && creating) {
    return (
      <div className="border border-navy/20 rounded p-4 flex flex-col gap-2">
        <p className="text-sm font-bold">Kreirajte prvi cjenik za ovaj objekt</p>
        <p className="text-sm opacity-70">
          Cjenik je organizacijska cjelina (npr. "Restoranski meni", "Cjenik izleta 2026") — objekt
          može imati više njih. Ne utječe na zakonski izvoz: generirani .csv/.xml uvijek agregira sve
          stavke objekta zajedno.
        </p>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-bold mb-1">Naziv cjenika</label>
            <input
              value={naziv}
              onChange={(e) => setNaziv(e.target.value)}
              className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Kategorija cjenika (opcionalno)</label>
            <KategorijaCombobox
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
            <button type="submit" disabled={saving} className="btn-primary rounded px-4 py-2 font-bold disabled:opacity-50">
              {saving ? "Spremanje..." : "Kreiraj"}
            </button>
          </div>
        </form>
        {error && <p className="text-alert text-sm">{error}</p>}
      </div>
    );
  }

  const selectedCjenik = cjenici.find((c) => c.id === selectedCjenikId);
  const selectedLabel = kategorijaLabel(selectedCjenik, kategorije, podkategorije);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">Cjenik:</span>
        <select
          value={selectedCjenikId ?? "__none__"}
          onChange={(e) => onSelect(e.target.value === "__none__" ? null : e.target.value)}
          className="border border-navy/30 rounded px-3 py-2 bg-transparent text-sm"
        >
          {cjenici.map((c) => (
            <option key={c.id} value={c.id}>
              {c.naziv} ({itemCounts[c.id] ?? 0})
            </option>
          ))}
          {ungroupedItemCount > 0 && (
            <option value="__none__">Bez cjenika — starije stavke ({ungroupedItemCount})</option>
          )}
        </select>

        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded px-3 py-1.5 border border-navy/30 font-bold text-sm"
          >
            + Novi cjenik
          </button>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-center">
            <input
              value={naziv}
              onChange={(e) => setNaziv(e.target.value)}
              placeholder="Naziv novog cjenika"
              className="border border-navy/30 rounded px-3 py-1.5 bg-transparent text-sm"
              autoFocus
            />
            <div className="w-56">
              <KategorijaCombobox
                kategorije={kategorije}
                podkategorije={podkategorije}
                value={podkategorijaId}
                onChange={setPodkategorijaId}
              />
            </div>
            <button type="submit" disabled={saving} className="rounded px-3 py-1.5 border border-navy/30 font-bold text-sm disabled:opacity-50">
              {saving ? "..." : "Spremi"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError(null);
                setPodkategorijaId(null);
              }}
              className="text-sm text-slate underline"
            >
              Odustani
            </button>
          </form>
        )}
      </div>
      {selectedCjenik && (
        <p className="text-xs opacity-60">
          {selectedCjenik.naziv}
          {selectedLabel ? ` — ${selectedLabel}` : " — bez kategorije"}
        </p>
      )}
      {error && <p className="text-alert text-sm w-full">{error}</p>}
    </div>
  );
}
