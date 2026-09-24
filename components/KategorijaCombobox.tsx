"use client";

import { useMemo, useState } from "react";
import type { Database } from "@/lib/database.types";

type Kategorija = Database["public"]["Tables"]["kategorije"]["Row"];
type Podkategorija = Database["public"]["Tables"]["podkategorije"]["Row"];

/**
 * Pretraživi birač Sidrove interne poslovne kategorizacije (kategorija →
 * podkategorija). Korisnik tipka, rezultati se filtriraju i grupiraju po
 * glavnoj kategoriji (sama kategorija nije klikabilna, samo grupni naslov —
 * klikabilne su isključivo podkategorije).
 */
export function KategorijaCombobox({
  kategorije,
  podkategorije,
  value,
  onChange,
}: {
  kategorije: Kategorija[];
  podkategorije: Podkategorija[];
  value: string | null;
  onChange: (podkategorijaId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const kategorijaById = useMemo(() => new Map(kategorije.map((k) => [k.id, k])), [kategorije]);

  const selected = useMemo(() => podkategorije.find((p) => p.id === value) ?? null, [podkategorije, value]);
  const selectedLabel = selected ? `${kategorijaById.get(selected.kategorija_id)?.naziv ?? ""} — ${selected.naziv}` : "";

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q
      ? podkategorije.filter((p) => {
          const kategorijaNaziv = kategorijaById.get(p.kategorija_id)?.naziv ?? "";
          return p.naziv.toLowerCase().includes(q) || kategorijaNaziv.toLowerCase().includes(q);
        })
      : podkategorije;

    const byKategorija = new Map<string, Podkategorija[]>();
    for (const p of matching) {
      const arr = byKategorija.get(p.kategorija_id) ?? [];
      arr.push(p);
      byKategorija.set(p.kategorija_id, arr);
    }

    return kategorije
      .filter((k) => byKategorija.has(k.id))
      .map((k) => ({
        kategorija: k,
        items: (byKategorija.get(k.id) ?? []).sort((a, b) => a.redoslijed - b.redoslijed),
      }));
  }, [query, podkategorije, kategorije, kategorijaById]);

  function selectItem(p: Podkategorija) {
    onChange(p.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : selectedLabel}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => {
          // Odgoda da klik na opciju stigne prije nego se dropdown zatvori na blur.
          setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Pretražite kategoriju (npr. friz, restoran, taxi...)"
        autoComplete="off"
        className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto border border-navy/30 rounded bg-bg shadow-lg">
          {groups.length === 0 && <p className="px-3 py-2 text-sm opacity-60">Nema rezultata.</p>}
          {groups.map(({ kategorija, items }) => (
            <div key={kategorija.id}>
              <div className="px-3 py-1 text-xs font-bold uppercase opacity-60 bg-navy-light">{kategorija.naziv}</div>
              {items.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectItem(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-navy-light"
                >
                  {p.naziv}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
