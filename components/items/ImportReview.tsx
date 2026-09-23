"use client";

import { useState } from "react";
import type { ExtractedItem } from "@/lib/parsers/heuristics";

interface ReviewRow extends ExtractedItem {
  include: boolean;
}

export function ImportReview({
  venueId,
  initialItems,
  usedOcr = false,
  onSaved,
}: {
  venueId: string;
  initialItems: ExtractedItem[];
  usedOcr?: boolean;
  onSaved: (count: number) => void;
}) {
  const [rows, setRows] = useState<ReviewRow[]>(initialItems.map((i) => ({ ...i, include: true })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setError(null);
    const selected = rows.filter((r) => r.include && r.naziv.trim() && r.cijena > 0);
    if (selected.length === 0) {
      setError("Nema odabranih stavki za spremanje.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/items/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map((r) => ({
            tip: r.tip,
            naziv: r.naziv.trim(),
            cijena: r.cijena,
            kategorija: r.kategorija ?? null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Spremanje nije uspjelo.");
        return;
      }
      onSaved(data.count);
    } finally {
      setSaving(false);
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm opacity-70">Nije pronađena nijedna stavka za pregled.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm opacity-70">
        Pregledajte i ispravite izvučene stavke prije spremanja u cjenik ({rows.length} stavki).
      </p>
      {usedOcr && (
        <p className="text-alert text-sm">
          Stavke su prepoznate OCR-om (optičko prepoznavanje teksta iz slike stranice, ne izravno iz
          PDF teksta). OCR je manje pouzdan od izravne ekstrakcije — molimo pažljivije provjerite
          nazive i cijene prije spremanja.
        </p>
      )}
      <div className="max-h-96 overflow-y-auto flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2 border border-navy/10 rounded px-3 py-2">
            <input
              type="checkbox"
              checked={row.include}
              onChange={(e) => update(index, { include: e.target.checked })}
            />
            <select
              value={row.tip}
              onChange={(e) => update(index, { tip: e.target.value as ReviewRow["tip"] })}
              className="border border-navy/30 rounded px-2 py-1 bg-transparent text-sm"
            >
              <option value="proizvod">Proizvod</option>
              <option value="usluga">Usluga</option>
            </select>
            <input
              value={row.naziv}
              onChange={(e) => update(index, { naziv: e.target.value })}
              className="flex-1 border border-navy/30 rounded px-2 py-1 bg-transparent text-sm"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={row.cijena}
              onChange={(e) => update(index, { cijena: Number(e.target.value) })}
              className="w-24 border border-navy/30 rounded px-2 py-1 bg-transparent text-sm"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-alert text-sm">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary rounded px-4 py-2 font-bold disabled:opacity-50 self-start"
      >
        {saving ? "Spremanje..." : "Spremi odabrane stavke u cjenik"}
      </button>
    </div>
  );
}
