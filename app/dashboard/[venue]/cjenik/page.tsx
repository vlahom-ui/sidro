import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ItemsManager } from "@/components/items/ItemsManager";
import { ImportPanel } from "@/components/items/ImportPanel";

export default async function CjenikPage({
  params,
}: {
  params: Promise<{ venue: string }>;
}) {
  const { venue: venueId } = await params;
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

        <section className="mb-10">
          <h2 className="font-bold mb-3">Uvoz cjenika</h2>
          <ImportPanel venueId={venue.id} />
        </section>

        <section>
          <h2 className="font-bold mb-3">Stavke cjenika</h2>
          <ItemsManager
            venueId={venue.id}
            initialItems={items ?? []}
            initialItemGroups={itemGroups ?? []}
            defaultTip={venue.default_tip}
          />
        </section>
      </div>
    </main>
  );
}
