import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertVenueOwner } from "@/lib/ownership";
import { logAudit } from "@/lib/audit";

const itemSchema = z.object({
  tip: z.enum(["proizvod", "usluga"]),
  naziv: z.string().min(1).max(300),
  cijena: z.coerce.number().nonnegative(),
  kategorija: z.string().max(200).nullable().optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(2000),
});

export async function POST(
  request: Request,
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

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Nevažeći podaci." }, { status: 400 });

  const rows = parsed.data.items.map((i) => ({
    venue_id: venueId,
    tip: i.tip,
    naziv: i.naziv,
    cijena: i.cijena,
    kategorija: i.kategorija ?? null,
  }));

  const { data: inserted, error } = await supabase.from("items").insert(rows).select();
  if (error) return NextResponse.json({ error: "Spremanje nije uspjelo." }, { status: 500 });

  await logAudit({
    userId: user.id,
    venueId,
    action: "item_bulk_update",
    outcome: "success",
    details: `Uvezeno i spremljeno ${inserted?.length ?? 0} stavki`,
  });

  return NextResponse.json({ items: inserted, count: inserted?.length ?? 0 });
}
