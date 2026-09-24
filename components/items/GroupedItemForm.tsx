"use client";

import { useState } from "react";
import type { ItemTip } from "@/lib/database.types";
import { apiFetch } from "@/lib/apiFetch";

interface ListRow {
  label: string;
  cijena: string;
}

type VariantMode = "lista" | "matrica";

function pluralizeOsoba(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 12 && mod100 <= 14) return `${n} osoba`;
  if (mod10 === 1) return `${n} osoba`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} osobe`;
  return `${n} osoba`;
}

function parseAxisValues(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function GroupedItemForm({
  venueId,
  defaultTip,
  onSaved,
  onCancel,
}: {
  venueId: string;
  defaultTip?: ItemTip | null;
  onSaved: (count: number) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [tip, setTip] = useState<ItemTip>(defaultTip ?? "usluga");
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [trajanje, setTrajanje] = useState("");

  const [mode, setMode] = useState<VariantMode>("lista");

  // 1D lista
  const [rows, setRows] = useState<ListRow[]>([
    { label: "", cijena: "" },
    { label: "", cijena: "" },
  ]);
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("6");

  // 2D matrica
  const [axis1Name, setAxis1Name] = useState("");
  const [axis1ValuesRaw, setAxis1ValuesRaw] = useState("");
  const [axis2Name, setAxis2Name] = useState("");
  const [axis2ValuesRaw, setAxis2ValuesRaw] = useState("");
  const [matrix, setMatrix] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, patch: Partial<ListRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { label: "", cijena: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function generateRange() {
    const from = Number(rangeFrom);
    const to = Number(rangeTo);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from || to - from > 100) {
      setError("Nevažeći raspon.");
      return;
    }
    setError(null);
    const generated: ListRow[] = [];
    for (let n = from; n <= to; n++) {
      generated.push({ label: pluralizeOsoba(n), cijena: "" });
    }
    setRows(generated);
  }

  const axis1Values = parseAxisValues(axis1ValuesRaw);
  const axis2Values = parseAxisValues(axis2ValuesRaw);

  function matrixKey(v1: string, v2: string) {
    return `${v1}\u0000${v2}`;
  }

  function setMatrixCell(v1: string, v2: string, value: string) {
    setMatrix((prev) => ({ ...prev, [matrixKey(v1, v2)]: value }));
  }

  function buildVariants(): { label: string; cijena: number }[] {
    if (mode === "lista") {
      return rows
        .filter((r) => r.label.trim() && Number(r.cijena) > 0)
        .map((r) => ({ label: r.label.trim(), cijena: Number(r.cijena) }));
    }
    const variants: { label: string; cijena: number }[] = [];
    for (const v1 of axis1Values) {
      for (const v2 of axis2Values) {
        const raw = matrix[matrixKey(v1, v2)];
        const cijena = Number(raw);
        if (raw && Number.isFinite(cijena) && cijena > 0) {
          variants.push({ label: `${v1} / ${v2}`, cijena });
        }
      }
    }
    return variants;
  }

  async function handleSubmit() {
    setError(null);
    if (!naziv.trim()) {
      setError("Naziv grupe je obavezan.");
      setStep(1);
      return;
    }
    const variants = buildVariants();
    if (variants.length === 0) {
      setError("Unesite barem jednu varijantu s cijenom.");
      return;
    }

    setSaving(true);
    try {
      const { ok, data, error: apiError } = await apiFetch<{ items: unknown[] }>(
        `/api/venues/${venueId}/item-groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tip,
            naziv: naziv.trim(),
            opis: opis.trim() || null,
            trajanje: trajanje.trim() || null,
            variants,
          }),
        }
      );
      if (!ok || !data) {
        setError(apiError ?? "Spremanje nije uspjelo.");
        return;
      }
      onSaved(data.items.length);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border border-navy/20 rounded p-4">
      <div className="flex items-center gap-2 text-xs opacity-60">
        <span className={step === 1 ? "font-bold opacity-100" : ""}>1. Osnovni podaci</span>
        <span>→</span>
        <span className={step === 2 ? "font-bold opacity-100" : ""}>2. Varijante</span>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-4">
            <label className="flex items-center gap-1 text-sm">
              <input type="radio" checked={tip === "proizvod"} onChange={() => setTip("proizvod")} />
              Proizvod
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input type="radio" checked={tip === "usluga"} onChange={() => setTip("usluga")} />
              Usluga
            </label>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Naziv grupe</label>
            <input
              value={naziv}
              onChange={(e) => setNaziv(e.target.value)}
              placeholder="npr. Esencija Dubrovnika"
              className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Opis (opcionalno)</label>
            <input
              value={opis}
              onChange={(e) => setOpis(e.target.value)}
              placeholder="npr. Privatni obilazak Starog grada"
              className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Trajanje (opcionalno)</label>
            <input
              value={trajanje}
              onChange={(e) => setTrajanje(e.target.value)}
              placeholder="npr. 2 sata"
              className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (naziv.trim() ? setStep(2) : setError("Naziv grupe je obavezan."))}
              className="btn-primary rounded px-4 py-2 font-bold"
            >
              Dalje →
            </button>
            <button type="button" onClick={onCancel} className="rounded px-4 py-2 border border-navy/30">
              Odustani
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMode("lista")}
              className={`px-3 py-1.5 rounded border ${
                mode === "lista" ? "bg-navy text-navy-light border-navy" : "border-navy/30"
              }`}
            >
              Jednostavna lista
            </button>
            <button
              type="button"
              onClick={() => setMode("matrica")}
              className={`px-3 py-1.5 rounded border ${
                mode === "matrica" ? "bg-navy text-navy-light border-navy" : "border-navy/30"
              }`}
            >
              Matrica (2 varijable)
            </button>
          </div>

          {mode === "lista" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-2 text-sm bg-navy-light/40 rounded px-3 py-2">
                <span className="opacity-70">Brzi unos raspona (broj osoba):</span>
                <input
                  type="number"
                  min="1"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="w-16 border border-navy/30 rounded px-2 py-1 bg-transparent"
                />
                <span>do</span>
                <input
                  type="number"
                  min="1"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="w-16 border border-navy/30 rounded px-2 py-1 bg-transparent"
                />
                <button
                  type="button"
                  onClick={generateRange}
                  className="rounded px-3 py-1 border border-navy/30 font-bold"
                >
                  Generiraj
                </button>
              </div>

              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={row.label}
                    onChange={(e) => updateRow(index, { label: e.target.value })}
                    placeholder="Oznaka varijante (npr. 1-2 osobe)"
                    className="flex-1 border border-navy/30 rounded px-3 py-2 bg-transparent text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.cijena}
                    onChange={(e) => updateRow(index, { cijena: e.target.value })}
                    placeholder="Cijena"
                    className="w-28 border border-navy/30 rounded px-3 py-2 bg-transparent text-sm"
                  />
                  <button type="button" onClick={() => removeRow(index)} className="text-alert text-sm">
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRow}
                className="rounded px-3 py-1.5 border border-navy/30 font-bold self-start text-sm"
              >
                + Dodaj red
              </button>
            </div>
          )}

          {mode === "matrica" && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">Os 1 — naziv (informativno)</label>
                  <input
                    value={axis1Name}
                    onChange={(e) => setAxis1Name(e.target.value)}
                    placeholder="npr. Broj osoba"
                    className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent text-sm mb-2"
                  />
                  <label className="block text-sm font-bold mb-1">Vrijednosti (odvojene zarezom)</label>
                  <input
                    value={axis1ValuesRaw}
                    onChange={(e) => setAxis1ValuesRaw(e.target.value)}
                    placeholder="1 osoba, 2 osobe, 3 osobe, 4 osobe"
                    className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Os 2 — naziv (informativno)</label>
                  <input
                    value={axis2Name}
                    onChange={(e) => setAxis2Name(e.target.value)}
                    placeholder="npr. Broj čaša"
                    className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent text-sm mb-2"
                  />
                  <label className="block text-sm font-bold mb-1">Vrijednosti (odvojene zarezom)</label>
                  <input
                    value={axis2ValuesRaw}
                    onChange={(e) => setAxis2ValuesRaw(e.target.value)}
                    placeholder="5 čaša, 7 čaša"
                    className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent text-sm"
                  />
                </div>
              </div>

              {axis1Values.length > 0 && axis2Values.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-navy/10 px-2 py-1"></th>
                        {axis2Values.map((v2) => (
                          <th key={v2} className="border border-navy/10 px-2 py-1 font-bold">
                            {v2}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {axis1Values.map((v1) => (
                        <tr key={v1}>
                          <td className="border border-navy/10 px-2 py-1 font-bold">{v1}</td>
                          {axis2Values.map((v2) => (
                            <td key={v2} className="border border-navy/10 px-1 py-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={matrix[matrixKey(v1, v2)] ?? ""}
                                onChange={(e) => setMatrixCell(v1, v2, e.target.value)}
                                className="w-20 border border-navy/30 rounded px-2 py-1 bg-transparent"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-alert text-sm">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary rounded px-4 py-2 font-bold disabled:opacity-50"
            >
              {saving ? "Spremanje..." : "Spremi grupu i varijante"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="rounded px-4 py-2 border border-navy/30">
              ← Natrag
            </button>
            <button type="button" onClick={onCancel} className="rounded px-4 py-2 border border-navy/30">
              Odustani
            </button>
          </div>
        </div>
      )}

      {step === 1 && error && <p className="text-alert text-sm">{error}</p>}
    </div>
  );
}
