import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CjenikWorkspace } from "@/components/items/CjenikWorkspace";

export default async function CjenikPage({
  params,
  searchParams,
}: {
  params: Promise<{ venue: string }>;
  searchParams: Promise<{ cjenik?: string }>;
}) {
  const { venue: venueId } = await params;
  const { cjenik: cjenikParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: venue } = await supabase
    .from("venues")
    .select("id, naziv, default_tip")
    .eq("id", venueId)
    .maybeSingle();
  if (!venue) notFound();

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  const { data: itemGroups } = await supabase
    .from("item_groups")
    .select("*")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  const { data: cjenici } = await supabase
    .from("cjenici")
    .select("*")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  const { data: kategorije } = await supabase.from("kategorije").select("*").order("redoslijed");
  const { data: podkategorije } = await supabase.from("podkategorije").select("*").order("redoslijed");

  return (
    <main className="min-h-screen">
      <DashboardHeader email={user.email ?? ""} />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Cjenik — {venue.naziv}</h1>
          <Link href={`/dashboard/${venue.id}`} className="text-slate underline text-sm">
            ← Natrag na objekt
          </Link>
        </div>

        <CjenikWorkspace
          venueId={venue.id}
          initialCjenici={cjenici ?? []}
          initialItems={items ?? []}
          initialItemGroups={itemGroups ?? []}
          initialCjenikId={cjenikParam ?? null}
          defaultTip={venue.default_tip}
          kategorije={kategorije ?? []}
          podkategorije={podkategorije ?? []}
        />
      </div>
    </main>
  );
}
