"use client";

import { useState } from "react";
import type { Database, ItemDostupnost, ItemTip } from "@/lib/database.types";

type Item = Database["public"]["Tables"]["items"]["Row"];

export interface ItemFormValues {
  tip: ItemTip;
  naziv: string;
  cijena: string;
  sidrenaCijena: string;
  urlSlike: string;
  kategorija: string;
  posebanOblikProdaje: boolean;
  nazivPosebnogOblika: string;
  sifra: string;
  marka: string;
  jedinicaMjere: string;
  cijenaPoJedinici: string;
  barkod: string;
  dostupnost: ItemDostupnost | "";
}

function fromItem(item?: Item, defaultTip?: ItemTip | null): ItemFormValues {
  return {
    tip: item?.tip ?? defaultTip ?? "proizvod",
    naziv: item?.naziv ?? "",
    cijena: item?.cijena?.toString() ?? "",
    sidrenaCijena: item?.sidrena_cijena?.toString() ?? "",
    urlSlike: item?.url_slike ?? "",
    kategorija: item?.kategorija ?? "",
    posebanOblikProdaje: item?.poseban_oblik_prodaje ?? false,
    nazivPosebnogOblika: item?.naziv_posebnog_oblika ?? "",
    sifra: item?.sifra ?? "",
    marka: item?.marka ?? "",
    jedinicaMjere: item?.jedinica_mjere ?? "",
    cijenaPoJedinici: item?.cijena_po_jedinici?.toString() ?? "",
    barkod: item?.barkod ?? "",
    dostupnost: item?.dostupnost ?? "",
  };
}

export function ItemForm({
  item,
  onSubmit,
  onCancel,
  submitLabel,
  defaultTip,
}: {
  item?: Item;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  defaultTip?: ItemTip | null;
}) {
  const isNew = !item;
  const [values, setValues] = useState<ItemFormValues>(fromItem(item, defaultTip));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sidrena cijena prati cijenu dok korisnik ne uredi sidrenu cijenu ručno —
  // samo za novu stavku (postojeća stavka ima svoju povijesnu vrijednost).
  const [sidrenaTouched, setSidrenaTouched] = useState(false);

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setCijena(value: string) {
    setValues((v) => ({
      ...v,
      cijena: value,
      sidrenaCijena: isNew && !sidrenaTouched ? value : v.sidrenaCijena,
    }));
  }

  function setSidrenaCijena(value: string) {
    setSidrenaTouched(true);
    set("sidrenaCijena", value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška.");
    } finally {
      setLoading(false);
    }
  }

  const showFirstSeenHint =
    item &&
    !item.sidrena_cijena &&
    item.first_seen_at !== null &&
    new Date(item.first_seen_at) > new Date("2026-09-10T00:00:00Z");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border border-navy/20 rounded p-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            checked={values.tip === "proizvod"}
            onChange={() => set("tip", "proizvod")}
          />
          Proizvod
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            checked={values.tip === "usluga"}
            onChange={() => set("tip", "usluga")}
          />
          Usluga
        </label>
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Naziv</label>
        <input
          required
          value={values.naziv}
          onChange={(e) => set("naziv", e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold mb-1">Cijena (EUR)</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={values.cijena}
            onChange={(e) => setCijena(e.target.value)}
            className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Sidrena cijena (10.9.2026.)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.sidrenaCijena}
            onChange={(e) => setSidrenaCijena(e.target.value)}
            className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
          />
          {showFirstSeenHint && (
            <p className="text-xs text-alert mt-1">
              Stavka nije postojala 10.9.2026. — predlažemo da prva cijena postane sidrena cijena.
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Kategorija (opcionalno)</label>
        <input
          value={values.kategorija}
          onChange={(e) => set("kategorija", e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">URL slike (opcionalno)</label>
        <input
          type="url"
          value={values.urlSlike}
          onChange={(e) => set("urlSlike", e.target.value)}
          className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.posebanOblikProdaje}
          onChange={(e) => set("posebanOblikProdaje", e.target.checked)}
        />
        Poseban oblik prodaje (npr. akcija, rasprodaja)
      </label>
      {values.posebanOblikProdaje && (
        <div>
          <label className="block text-sm font-bold mb-1">Naziv posebnog oblika prodaje</label>
          <input
            value={values.nazivPosebnogOblika}
            onChange={(e) => set("nazivPosebnogOblika", e.target.value)}
            className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
          />
        </div>
      )}

      {values.tip === "proizvod" && (
        <div className="grid grid-cols-2 gap-3 border-t border-navy/10 pt-3">
          <div>
            <label className="block text-sm font-bold mb-1">Šifra</label>
            <input
              value={values.sifra}
              onChange={(e) => set("sifra", e.target.value)}
              className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Marka</label>
            <input
              value={values.marka}
              onChange={(e) => set("marka", e.target.value)}
              className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Jedinica mjere</label>
            <input
              value={values.jedinicaMjere}
              onChange={(e) => set("jedinicaMjere", e.target.value)}
              placeholder="npr. kg, l, kom"
              className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Cijena za jedinicu mjere</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={values.cijenaPoJedinici}
              onChange={(e) => set("cijenaPoJedinici", e.target.value)}
              className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Barkod</label>
            <input
              value={values.barkod}
              onChange={(e) => set("barkod", e.target.value)}
              className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Dostupnost</label>
            <select
              value={values.dostupnost}
              onChange={(e) => set("dostupnost", e.target.value as ItemDostupnost | "")}
              className="w-full border border-navy/30 rounded px-3 py-2 bg-transparent"
            >
              <option value="">—</option>
              <option value="dostupno">Dostupno</option>
              <option value="nedostupno">Nedostupno</option>
            </select>
          </div>
        </div>
      )}

      {error && <p className="text-alert text-sm">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary rounded px-4 py-2 font-bold disabled:opacity-50">
          {loading ? "Spremanje..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded px-4 py-2 border border-navy/30">
          Odustani
        </button>
      </div>
    </form>
  );
}
