import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { buildJsonLd } from "@/lib/generate/schemaOrg";
import { formatVenueAddress } from "@/lib/formatAddress";
import type { Database } from "@/lib/database.types";

type Item = Database["public"]["Tables"]["items"]["Row"];
type ItemGroup = Database["public"]["Tables"]["item_groups"]["Row"];

export const revalidate = 0;

async function loadVenue(slug: string) {
  const supabase = await createClient();
  const { data: venue } = await supabase.from("venues").select("*").eq("slug", slug).maybeSingle();
  return venue;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const venue = await loadVenue(slug);
  return { title: venue ? `Cjenik — ${venue.naziv} — sidro` : "Cjenik — sidro" };
}

function formatPrice(n: number) {
  return `${n.toFixed(2)} €`;
}

export default async function PublicVenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = await loadVenue(slug);

  if (!venue) notFound();

  if (venue.status !== "published") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">sidro</p>
          <p className="text-sm opacity-70">Cjenik za ovaj objekt još nije dostupan.</p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("venue_id", venue.id)
    .order("kategorija", { ascending: true })
    .order("redoslijed", { ascending: true });

  const { data: itemGroups } = await supabase
    .from("item_groups")
    .select("*")
    .eq("venue_id", venue.id);

  const { data: generatedFiles } = await supabase
    .from("generated_files")
    .select("*")
    .eq("venue_id", venue.id)
    .eq("is_current", true);

  const allItems = items ?? [];
  const allGroups = itemGroups ?? [];
  const proizvodi = allItems.filter((i) => i.tip === "proizvod");
  const usluge = allItems.filter((i) => i.tip === "usluga");
  const jsonLd = buildJsonLd(venue, allItems, allGroups);

  // Grupiranje preuzimanja po zakonskoj kategoriji (proizvod/usluga), ne
  // plosnat niz od 4 ravnopravna gumba — svaka kategorija ima svoju
  // strukturu stupaca pa se datoteke NE smiju spajati, samo prezentacija.
  const filesByTip = new Map<string, NonNullable<typeof generatedFiles>>();
  for (const f of generatedFiles ?? []) {
    const arr = filesByTip.get(f.tip) ?? [];
    arr.push(f);
    filesByTip.set(f.tip, arr);
  }
  const TIP_ROW_LABEL: Record<string, string> = { proizvod: "Cjenik proizvoda", usluga: "Cjenik usluga" };
  const tipRows = ["proizvod", "usluga"].filter((tip) => filesByTip.has(tip));

  return (
    <main className="min-h-screen px-4 py-10">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <p className="text-sm lowercase font-bold text-slate mb-1">sidro</p>
          <h1 className="text-2xl font-bold">{venue.naziv}</h1>
          <p className="text-sm opacity-70">{formatVenueAddress(venue)}</p>
        </header>

        {tipRows.length > 0 && (
          <section className="mb-8 flex flex-col gap-2">
            {tipRows.map((tip) => (
              <div key={tip} className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold">{TIP_ROW_LABEL[tip] ?? tip}</span>
                {(filesByTip.get(tip) ?? [])
                  .slice()
                  .sort((a, b) => a.format.localeCompare(b.format))
                  .map((f) => (
                    <a
                      key={f.id}
                      href={f.file_url}
                      className="text-xs border border-navy/30 rounded px-3 py-1.5 uppercase"
                    >
                      {f.format}
                    </a>
                  ))}
              </div>
            ))}
          </section>
        )}

        {usluge.length > 0 && (
          <section className="mb-10">
            <h2 className="font-bold text-lg mb-3">Usluge</h2>
            <ItemSection items={usluge} groups={allGroups.filter((g) => g.tip === "usluga")} />
          </section>
        )}

        {proizvodi.length > 0 && (
          <section className="mb-10">
            <h2 className="font-bold text-lg mb-3">Proizvodi</h2>
            <ItemSection items={proizvodi} groups={allGroups.filter((g) => g.tip === "proizvod")} />
          </section>
        )}

        {(!items || items.length === 0) && (
          <p className="text-sm opacity-70">Cjenik trenutno nema stavki.</p>
        )}
      </div>
    </main>
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
