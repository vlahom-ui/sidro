"use client";

import { useEffect, useState } from "react";
import type { Database, ItemTip } from "@/lib/database.types";
import { CjenikSelector } from "./CjenikSelector";
import { ImportPanel } from "./ImportPanel";
import { ItemsManager } from "./ItemsManager";

type Item = Database["public"]["Tables"]["items"]["Row"];
type ItemGroup = Database["public"]["Tables"]["item_groups"]["Row"];
type Cjenik = Database["public"]["Tables"]["cjenici"]["Row"];
type Kategorija = Database["public"]["Tables"]["kategorije"]["Row"];
type Podkategorija = Database["public"]["Tables"]["podkategorije"]["Row"];

const NONE = "__none__";

function storageKey(venueId: string) {
  return `sidro:lastCjenik:${venueId}`;
}

export function CjenikWorkspace({
  venueId,
  initialCjenici,
  initialItems,
  initialItemGroups,
  initialCjenikId,
  defaultTip,
  kategorije,
  podkategorije,
}: {
  venueId: string;
  initialCjenici: Cjenik[];
  initialItems: Item[];
  initialItemGroups: ItemGroup[];
  initialCjenikId: string | null;
  defaultTip?: ItemTip | null;
  kategorije: Kategorija[];
  podkategorije: Podkategorija[];
}) {
  const [cjenici, setCjenici] = useState<Cjenik[]>(initialCjenici);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>(initialItemGroups);

  // Server komponenta (roditelj) osvježi initialItems/initialItemGroups/
  // initialCjenici nakon router.refresh() poziva iz ItemsManager-a — ovdje
  // se ta nova vrijednost preuzima u lokalni state (npr. za itemCounts u
  // CjenikSelectoru, koji mora vidjeti stavke iz SVIH cjenika, ne samo
  // trenutno prikazanog).
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setItemGroups(initialItemGroups);
  }, [initialItemGroups]);

  useEffect(() => {
    setCjenici(initialCjenici);
  }, [initialCjenici]);

  const [selectedCjenikId, setSelectedCjenikId] = useState<string | null>(() => {
    if (initialCjenikId && initialCjenici.some((c) => c.id === initialCjenikId)) return initialCjenikId;
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(storageKey(venueId));
        if (stored === NONE) return null;
        if (stored && initialCjenici.some((c) => c.id === stored)) return stored;
      } catch {
        // localStorage nedostupan (privatni mod i sl.) — nastavi bez pamćenja.
      }
    }
    return initialCjenici[0]?.id ?? null;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(venueId), selectedCjenikId ?? NONE);
    } catch {
      // Nekritično — samo gubimo "zapamti zadnji cjenik" pogodnost.
    }
  }, [selectedCjenikId, venueId]);

  function handleCreated(cjenik: Cjenik) {
    setCjenici((prev) => [cjenik, ...prev]);
  }

  const itemCounts: Record<string, number> = {};
  let ungroupedCount = 0;
  for (const item of items) {
    if (item.cjenik_id) {
      itemCounts[item.cjenik_id] = (itemCounts[item.cjenik_id] ?? 0) + 1;
    } else {
      ungroupedCount++;
    }
  }

  const filteredItems = items.filter((i) => i.cjenik_id === selectedCjenikId);
  const filteredItemGroups = itemGroups.filter((g) => g.cjenik_id === selectedCjenikId);
  const existingItemCount = filteredItems.length;

  if (cjenici.length === 0) {
    return (
      <CjenikSelector
        venueId={venueId}
        cjenici={cjenici}
        kategorije={kategorije}
        podkategorije={podkategorije}
        selectedCjenikId={selectedCjenikId}
        itemCounts={itemCounts}
        onSelect={setSelectedCjenikId}
        onCreated={handleCreated}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CjenikSelector
        venueId={venueId}
        cjenici={cjenici}
        kategorije={kategorije}
        podkategorije={podkategorije}
        selectedCjenikId={selectedCjenikId}
        itemCounts={itemCounts}
        ungroupedItemCount={ungroupedCount}
        onSelect={setSelectedCjenikId}
        onCreated={handleCreated}
      />

      <section>
        <h2 className="font-bold mb-3">Uvoz cjenika</h2>
        <ImportPanel venueId={venueId} cjenikId={selectedCjenikId} existingItemCount={existingItemCount} />
      </section>

      <section>
        <h2 className="font-bold mb-3">Stavke cjenika</h2>
        <ItemsManager
          key={selectedCjenikId ?? NONE}
          venueId={venueId}
          cjenikId={selectedCjenikId}
          initialItems={filteredItems}
          initialItemGroups={filteredItemGroups}
          defaultTip={defaultTip}
        />
      </section>
    </div>
  );
}
