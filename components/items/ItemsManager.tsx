"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Database, ItemTip } from "@/lib/database.types";
import { ItemForm, type ItemFormValues } from "./ItemForm";
import { apiFetch } from "@/lib/apiFetch";

type Item = Database["public"]["Tables"]["items"]["Row"];

function toPayload(values: ItemFormValues) {
  return {
    tip: values.tip,
    naziv: values.naziv,
    cijena: Number(values.cijena),
    sidrenaCijena: values.sidrenaCijena === "" ? null : Number(values.sidrenaCijena),
    urlSlike: values.urlSlike || null,
    kategorija: values.kategorija || null,
    posebanOblikProdaje: values.posebanOblikProdaje,
    nazivPosebnogOblika: values.nazivPosebnogOblika || null,
    sifra: values.sifra || null,
    marka: values.marka || null,
    jedinicaMjere: values.jedinicaMjere || null,
    cijenaPoJedinici: values.cijenaPoJedinici === "" ? null : Number(values.cijenaPoJedinici),
    barkod: values.barkod || null,
    dostupnost: values.dostupnost || null,
  };
}

export function ItemsManager({
  venueId,
  initialItems,
  defaultTip,
}: {
  venueId: string;
  initialItems: Item[];
  defaultTip?: ItemTip | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  async function handleCreate(values: ItemFormValues) {
    const { ok, data, error } = await apiFetch<{ item: Item }>(`/api/venues/${venueId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(values)),
    });
    if (!ok || !data) throw new Error(error ?? "Greška.");
    setItems((prev) => [data.item, ...prev]);
    setAdding(false);
  }

  async function handleUpdate(itemId: string, values: ItemFormValues) {
    const { ok, data, error } = await apiFetch<{ item: Item }>(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(values)),
    });
    if (!ok || !data) throw new Error(error ?? "Greška.");
    setItems((prev) => prev.map((i) => (i.id === itemId ? data.item : i)));
    setEditingId(null);
  }

  async function handleDelete(itemId: string) {
    if (!confirm("Obrisati ovu stavku?")) return;
    setBulkMessage(null);
    setBulkError(null);
    const { ok, error } = await apiFetch(`/api/items/${itemId}`, { method: "DELETE" });
    if (!ok) {
      setBulkError(error ?? "Brisanje nije uspjelo.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function handleSetAnchor() {
    setBulkLoading(true);
    setBulkMessage(null);
    setBulkError(null);
    try {
      const { ok, data, error } = await apiFetch<{ updated: number }>(
        `/api/venues/${venueId}/items/set-anchor`,
        { method: "POST" }
      );
      if (!ok || !data) {
        setBulkError(error ?? "Postavljanje sidrene cijene nije uspjelo.");
        return;
      }
      setBulkMessage(`Sidrena cijena postavljena za ${data.updated} stavki.`);
      router.refresh();
      setItems((prev) => prev.map((i) => (i.sidrena_cijena === null ? { ...i, sidrena_cijena: i.cijena } : i)));
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 items-center">
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary rounded px-4 py-2 font-bold">
            + Dodaj stavku
          </button>
        )}
        <button
          onClick={handleSetAnchor}
          disabled={bulkLoading}
          className="rounded px-4 py-2 border border-navy/30 font-bold disabled:opacity-50"
        >
          {bulkLoading ? "..." : "Postavi sidrenu cijenu = trenutnu (za prazne)"}
        </button>
      </div>
      {bulkMessage && <p className="text-sm">{bulkMessage}</p>}
      {bulkError && <p className="text-alert text-sm">{bulkError}</p>}

      {adding && (
        <ItemForm
          submitLabel="Spremi stavku"
          onSubmit={handleCreate}
          onCancel={() => setAdding(false)}
          defaultTip={defaultTip}
        />
      )}

      {items.length === 0 ? (
        <p className="text-sm opacity-70">Još nema stavki. Dodajte ručno ili uvezite cjenik.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) =>
            editingId === item.id ? (
              <ItemForm
                key={item.id}
                item={item}
                submitLabel="Spremi izmjene"
                onSubmit={(values) => handleUpdate(item.id, values)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={item.id}
                className="flex items-center justify-between border border-navy/10 rounded px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{item.naziv}</span>
                    <span className="text-xs px-2 py-0.5 rounded border border-navy/30">{item.tip}</span>
                    {!item.sidrena_cijena && (
                      <span className="text-xs text-alert">bez sidrene cijene</span>
                    )}
                  </div>
                  <div className="text-sm opacity-70">
                    {item.cijena.toFixed(2)} EUR
                    {item.sidrena_cijena !== null && ` · sidrena: ${item.sidrena_cijena.toFixed(2)} EUR`}
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => setEditingId(item.id)} className="text-slate underline">
                    Uredi
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-alert underline">
                    Obriši
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
