"use client";

import { useState } from "react";
import type { ExtractedItem } from "@/lib/parsers/heuristics";
import { apiFetch } from "@/lib/apiFetch";

interface ReviewRow extends ExtractedItem {
  include: boolean;
}

interface BatchSaveResult {
  count: number;
}

export function ImportReview({
  venueId,
  cjenikId,
  existingItemCount = 0,
  initialItems,
  usedOcr = false,
  onSaved,
}: {
  venueId: string;
  cjenikId: string | null;
  existingItemCount?: number;
  initialItems: ExtractedItem[];
  usedOcr?: boolean;
  onSaved: (count: number) => void;
}) {
  const [rows, setRows] = useState<ReviewRow[]>(initialItems.map((i) => ({ ...i, include: true })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateNames, setDuplicateNames] = useState<string[] | null>(null);
  const [bulkTip, setBulkTip] = useState<ReviewRow["tip"]>("proizvod");
  const [bulkCijena, setBulkCijena] = useState("");

  function update(index: number, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  const selectedCount = rows.filter((r) => r.include).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  function toggleSelectAll(checked: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, include: checked })));
  }

  function applyBulkTip() {
    setRows((prev) => prev.map((r) => (r.include ? { ...r, tip: bulkTip } : r)));
  }

  function applyBulkCijena() {
    const value = Number(bulkCijena.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    setRows((prev) => prev.map((r) => (r.include ? { ...r, cijena: value } : r)));
    setBulkCijena("");
  }

  async function save(mode: "add" | "replace", force: boolean) {
    setError(null);
    setDuplicateNames(null);
    const selected = rows.filter((r) => r.include && r.naziv.trim() && r.cijena > 0);
    if (selected.length === 0) {
      setError("Nema odabranih stavki za spremanje.");
      return;
    }
    setSaving(true);
    try {
      const { ok, data, error: apiError, status, errorBody } = await apiFetch<BatchSaveResult>(
        `/api/venues/${venueId}/items/batch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: selected.map((r) => ({
              tip: r.tip,
              naziv: r.naziv.trim(),
              cijena: r.cijena,
              kategorija: r.kategorija ?? null,
            })),
            cjenikId,
            mode,
            force,
          }),
        }
      );
      if (!ok || !data) {
        if (status === 409) {
          const duplicates = (errorBody as { duplicates?: string[] } | null)?.duplicates;
          if (Array.isArray(duplicates) && duplicates.length > 0) {
            setDuplicateNames(duplicates);
            return;
          }
        }
        setError(apiError ?? "Spremanje nije uspjelo.");
        return;
      }
      onSaved(data.count);
    } finally {
      setSaving(false);
    }
  }

  function handleAdd() {
    save("add", false);
  }

  function handleConfirmDuplicates() {
    save("add", true);
  }

  function handleReplace() {
    if (
      !confirm(
        `Ovo će obrisati svih ${existingItemCount} postojećih stavki u ovom cjeniku i zamijeniti ih novo uvezenim stavkama. Ova radnja se ne može poništiti. Nastaviti?`
      )
    ) {
      return;
    }
    save("replace", true);
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
      <div className="flex items-center gap-2 text-sm border-b border-navy/10 pb-2">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => toggleSelectAll(e.target.checked)}
          aria-label="Odaberi sve"
        />
        <span className="opacity-70">
          {allSelected ? "Odznači sve" : "Odaberi sve"} ({selectedCount}/{rows.length})
        </span>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm bg-navy-light/40 rounded px-3 py-2">
          <span className="opacity-70">Za {selectedCount} odabranih:</span>
          <select
            value={bulkTip}
            onChange={(e) => setBulkTip(e.target.value as ReviewRow["tip"])}
            className="border border-navy/30 rounded px-2 py-1 bg-transparent"
          >
            <option value="proizvod">Proizvod</option>
            <option value="usluga">Usluga</option>
          </select>
          <button type="button" onClick={applyBulkTip} className="rounded px-3 py-1 border border-navy/30 font-bold">
            Postavi tip
          </button>
          <span className="opacity-40">·</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Cijena"
            value={bulkCijena}
            onChange={(e) => setBulkCijena(e.target.value)}
            className="w-24 border border-navy/30 rounded px-2 py-1 bg-transparent"
          />
          <button
            type="button"
            onClick={applyBulkCijena}
            disabled={!bulkCijena}
            className="rounded px-3 py-1 border border-navy/30 font-bold disabled:opacity-50"
          >
            Postavi cijenu
          </button>
        </div>
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

      {duplicateNames && (
        <div className="border border-alert/40 rounded px-3 py-2 flex flex-col gap-2">
          <p className="text-alert text-sm">
            Ove stavke već postoje u ovom cjeniku (isti naziv i cijena): {duplicateNames.join(", ")}.
          </p>
          <button
            type="button"
            onClick={handleConfirmDuplicates}
            disabled={saving}
            className="rounded px-3 py-1.5 border border-alert text-alert font-bold text-sm self-start disabled:opacity-50"
          >
            {saving ? "Spremanje..." : "Svejedno dodaj (dupliciraj)"}
          </button>
        </div>
      )}

      {error && <p className="text-alert text-sm">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleAdd}
          disabled={saving}
          className="btn-primary rounded px-4 py-2 font-bold disabled:opacity-50"
        >
          {saving ? "Spremanje..." : existingItemCount > 0 ? "Dodaj ovim stavkama" : "Spremi odabrane stavke u cjenik"}
        </button>
        {existingItemCount > 0 && (
          <button
            onClick={handleReplace}
            disabled={saving}
            className="rounded px-4 py-2 border border-navy/30 font-bold disabled:opacity-50"
          >
            Zamijeni postojeće stavke u ovom cjeniku ({existingItemCount})
          </button>
        )}
      </div>
    </div>
  );
}
