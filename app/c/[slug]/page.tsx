import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { buildJsonLd } from "@/lib/generate/schemaOrg";

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

  const { data: generatedFiles } = await supabase
    .from("generated_files")
    .select("*")
    .eq("venue_id", venue.id)
    .eq("is_current", true);

  const proizvodi = (items ?? []).filter((i) => i.tip === "proizvod");
  const usluge = (items ?? []).filter((i) => i.tip === "usluga");
  const jsonLd = buildJsonLd(venue, items ?? []);

  return (
    <main className="min-h-screen px-4 py-10">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <p className="text-sm lowercase font-bold text-slate mb-1">sidro</p>
          <h1 className="text-2xl font-bold">{venue.naziv}</h1>
          <p className="text-sm opacity-70">{venue.adresa}</p>
        </header>

        {generatedFiles && generatedFiles.length > 0 && (
          <section className="mb-8 flex flex-wrap gap-2">
            {generatedFiles.map((f) => (
              <a
                key={f.id}
                href={f.file_url}
                className="text-xs border border-navy/30 rounded px-3 py-1.5 uppercase"
              >
                Preuzmi {f.tip} ({f.format})
              </a>
            ))}
          </section>
        )}

        {usluge.length > 0 && (
          <section className="mb-10">
            <h2 className="font-bold text-lg mb-3">Usluge</h2>
            <ItemTable items={usluge} />
          </section>
        )}

        {proizvodi.length > 0 && (
          <section className="mb-10">
            <h2 className="font-bold text-lg mb-3">Proizvodi</h2>
            <ItemTable items={proizvodi} />
          </section>
        )}

        {(!items || items.length === 0) && (
          <p className="text-sm opacity-70">Cjenik trenutno nema stavki.</p>
        )}
      </div>
    </main>
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
