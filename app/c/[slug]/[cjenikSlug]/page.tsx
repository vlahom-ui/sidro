import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatVenueAddress } from "@/lib/formatAddress";
import { PublicPriceList } from "@/components/PublicPriceList";

export const revalidate = 0;

// Namjerno service-role klijent, ne RLS-ograničen createClient() — ova
// stranica RADI NEOVISNO O venue.status (draft ili published), za razliku
// od glavne /c/{slug} stranice čiji je javni pristup gatean isključivo
// preko RLS politika koje traže status='published'. Cjenici tablica nema
// (i namjerno ne dobiva) opću javnu RLS politiku jer bi to otvorilo SVE
// cjenike svih objekata bilo kome tko zna bilo koji slug par — pristup je
// ovdje ograničen u aplikacijskom kodu (točan venue_id + cjenik_id), isti
// "capability URL" model kao i sam venue slug.
async function loadVenueAndCjenik(venueSlug: string, cjenikSlug: string) {
  const admin = createAdminClient();
  const { data: venue } = await admin.from("venues").select("*").eq("slug", venueSlug).maybeSingle();
  if (!venue) return { venue: null, cjenik: null };

  const { data: cjenik } = await admin
    .from("cjenici")
    .select("*")
    .eq("venue_id", venue.id)
    .eq("slug", cjenikSlug)
    .maybeSingle();

  return { venue, cjenik };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; cjenikSlug: string }>;
}): Promise<Metadata> {
  const { slug, cjenikSlug } = await params;
  const { venue, cjenik } = await loadVenueAndCjenik(slug, cjenikSlug);
  return {
    title: venue && cjenik ? `${cjenik.naziv} — ${venue.naziv} — sidro` : "Cjenik — sidro",
  };
}

export default async function PublicCjenikPage({
  params,
}: {
  params: Promise<{ slug: string; cjenikSlug: string }>;
}) {
  const { slug, cjenikSlug } = await params;
  const { venue, cjenik } = await loadVenueAndCjenik(slug, cjenikSlug);

  if (!venue || !cjenik) notFound();

  const admin = createAdminClient();
  const { data: items } = await admin
    .from("items")
    .select("*")
    .eq("cjenik_id", cjenik.id)
    .order("kategorija", { ascending: true })
    .order("redoslijed", { ascending: true });

  const { data: itemGroups } = await admin.from("item_groups").select("*").eq("cjenik_id", cjenik.id);

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <p className="text-sm lowercase font-bold text-slate mb-1">sidro — pregled cjenika</p>
          <h1 className="text-2xl font-bold">{cjenik.naziv}</h1>
          <p className="text-sm opacity-70">
            {venue.naziv} — {formatVenueAddress(venue)}
          </p>
        </header>

        <PublicPriceList items={items ?? []} groups={itemGroups ?? []} />
      </div>
    </main>
  );
}
