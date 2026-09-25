import type { Database } from "@/lib/database.types";

type Item = Database["public"]["Tables"]["items"]["Row"];
type ItemGroup = Database["public"]["Tables"]["item_groups"]["Row"];

export function formatPrice(n: number): string {
  return `${n.toFixed(2)} €`;
}

/**
 * Dijeli stavke na proizvode/usluge i prikazuje svaku sekciju — dijeljeno
 * između glavne /c/{slug} stranice (agregat svih cjenika objekta) i
 * pregled-po-cjeniku /c/{slug}/{cjenikSlug} stranice (samo jedan cjenik).
 * Isti vizualni stil na oba mjesta, namjerno bez download gumba ovdje —
 * to ostaje specifično za glavnu stranicu jer generirana .csv/.xml
 * datoteka postoji samo na razini cijelog objekta, nikad po cjeniku.
 */
export function PublicPriceList({ items, groups }: { items: Item[]; groups: ItemGroup[] }) {
  const proizvodi = items.filter((i) => i.tip === "proizvod");
  const usluge = items.filter((i) => i.tip === "usluga");

  return (
    <>
      {usluge.length > 0 && (
        <section className="mb-10">
          <h2 className="font-bold text-lg mb-3">Usluge</h2>
          <ItemSection items={usluge} groups={groups.filter((g) => g.tip === "usluga")} />
        </section>
      )}

      {proizvodi.length > 0 && (
        <section className="mb-10">
          <h2 className="font-bold text-lg mb-3">Proizvodi</h2>
          <ItemSection items={proizvodi} groups={groups.filter((g) => g.tip === "proizvod")} />
        </section>
      )}

      {items.length === 0 && <p className="text-sm opacity-70">Cjenik trenutno nema stavki.</p>}
    </>
  );
}

function ItemSection({ items, groups }: { items: Item[]; groups: ItemGroup[] }) {
  const variantsByGroupId = new Map<string, Item[]>();
  const ungrouped: Item[] = [];
  for (const item of items) {
    if (item.item_group_id) {
      const arr = variantsByGroupId.get(item.item_group_id) ?? [];
      arr.push(item);
      variantsByGroupId.set(item.item_group_id, arr);
    } else {
      ungrouped.push(item);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const variants = variantsByGroupId.get(group.id);
        if (!variants || variants.length === 0) return null;
        return (
          <div key={group.id} className="border border-navy/10 rounded p-4">
            <p className="font-bold">{group.naziv}</p>
            {group.opis && <p className="text-sm opacity-70 mt-0.5">{group.opis}</p>}
            {group.trajanje && <p className="text-xs opacity-60 mt-0.5">{group.trajanje}</p>}
            <div className="flex flex-col mt-3">
              {variants.map((v) => (
                <div
                  key={v.id}
                  className="flex items-baseline justify-between border-b border-navy/10 py-1.5 last:border-b-0"
                >
                  <span className="text-sm">{v.variant_label}</span>
                  <span className="text-right">
                    <span className="font-bold text-sm">{formatPrice(v.cijena)}</span>
                    {v.sidrena_cijena !== null && (
                      <span className="block text-xs opacity-60">
                        sidrena cijena (10.9.2026.): {formatPrice(v.sidrena_cijena)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {ungrouped.length > 0 && <ItemTable items={ungrouped} />}
    </div>
  );
}

function ItemTable({
  items,
}: {
  items: { id: string; naziv: string; cijena: number; sidrena_cijena: number | null; kategorija: string | null }[];
}) {
  let lastCategory: string | null = null;

  return (
    <div className="flex flex-col">
      {items.map((item) => {
        const showCategory = item.kategorija && item.kategorija !== lastCategory;
        lastCategory = item.kategorija;
        return (
          <div key={item.id}>
            {showCategory && (
              <p className="text-xs uppercase opacity-60 mt-4 mb-1 first:mt-0">{item.kategorija}</p>
            )}
            <div className="flex items-baseline justify-between border-b border-navy/10 py-2">
              <span>{item.naziv}</span>
              <span className="text-right">
                <span className="font-bold">{formatPrice(item.cijena)}</span>
                {item.sidrena_cijena !== null && (
                  <span className="block text-xs opacity-60">
                    sidrena cijena (10.9.2026.): {formatPrice(item.sidrena_cijena)}
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
