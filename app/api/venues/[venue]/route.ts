import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertVenueOwner } from "@/lib/ownership";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/apiRoute";

export const DELETE = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ venue: string }> }
) => {
  const { venue: venueId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });

  const venue = await assertVenueOwner(supabase, venueId, user.id);
  if (!venue) return NextResponse.json({ error: "Nije pronađeno." }, { status: 404 });

  const { count: cjenikCount } = await supabase
    .from("cjenici")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId);

  const { count: itemCount } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId);

  // audit_log.venue_id je "on delete set null" (ne cascade) — korisnik
  // eksplicitno traži da se ti zapisi obrišu, ne samo osirote, pa se to
  // radi ovdje ručno, PRIJE brisanja objekta (dok FK još drži vezu).
  await supabase.from("audit_log").delete().eq("venue_id", venueId);

  // Brisanje retka objekta povlači cascade brisanje (FK on delete cascade)
  // svih items, item_groups, price_history (preko items), cjenici,
  // import_sources, generated_files i image_candidates vezanih uz venue_id.
  const { error } = await supabase.from("venues").delete().eq("id", venueId);
  if (error) return NextResponse.json({ error: "Brisanje nije uspjelo." }, { status: 500 });

  // Objekt (pa time i sam njegov audit_log FK cilj) više ne postoji, zato
  // se ovaj zapis upisuje bez venueId — naziv/broj stavki idu u details.
  await logAudit({
    userId: user.id,
    action: "venue_delete",
    outcome: "success",
    details: `"${venue.naziv}" (${venueId}) — ${cjenikCount ?? 0} cjenika, ${itemCount ?? 0} stavki obrisano`,
  });

  return NextResponse.json({ ok: true, deletedCjenikCount: cjenikCount ?? 0, deletedItemCount: itemCount ?? 0 });
});
