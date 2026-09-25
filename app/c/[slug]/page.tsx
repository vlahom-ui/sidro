import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { buildJsonLd } from "@/lib/generate/schemaOrg";
import { formatVenueAddress } from "@/lib/formatAddress";
import { PublicPriceList } from "@/components/PublicPriceList";

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

        <PublicPriceList items={allItems} groups={allGroups} />
      </div>
    </main>
  );
}
