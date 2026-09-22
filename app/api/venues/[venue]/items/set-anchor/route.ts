import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertVenueOwner } from "@/lib/ownership";
import { logAudit } from "@/lib/audit";

/**
 * Masovno postavlja sidrenu_cijena = cijena za stavke kojima sidrena_cijena
 * još nije postavljena. Ne dira stavke koje su već ručno ispravljene.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ venue: string }> }
) {
  const { venue: venueId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });

  const venue = await assertVenueOwner(supabase, venueId, user.id);
  if (!venue) return NextResponse.json({ error: "Nije pronađeno." }, { status: 404 });

  const { data: items, error: fetchError } = await supabase
    .from("items")
    .select("id, cijena")
    .eq("venue_id", venueId)
    .is("sidrena_cijena", null);

  if (fetchError) return NextResponse.json({ error: "Greška." }, { status: 500 });
  if (!items || items.length === 0) return NextResponse.json({ updated: 0 });

  let updated = 0;
  for (const item of items) {
    const { error } = await supabase
      .from("items")
      .update({ sidrena_cijena: item.cijena })
      .eq("id", item.id)
      .is("sidrena_cijena", null);
    if (!error) updated += 1;
  }

  await logAudit({
    userId: user.id,
    venueId,
    action: "item_bulk_update",
    outcome: "success",
    details: `Postavljena sidrena cijena za ${updated} stavki`,
  });

  return NextResponse.json({ updated });
}
