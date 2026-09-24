import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertVenueOwner } from "@/lib/ownership";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/apiRoute";

const bodySchema = z.object({
  naziv: z.string().min(1).max(200),
});

export const POST = withErrorHandling(async (
  request: Request,
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

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Nevažeći podaci." }, { status: 400 });

  const { data: cjenik, error } = await supabase
    .from("cjenici")
    .insert({ venue_id: venueId, naziv: parsed.data.naziv })
    .select()
    .single();

  if (error || !cjenik) {
    return NextResponse.json({ error: "Stvaranje cjenika nije uspjelo." }, { status: 500 });
  }

  await logAudit({
    userId: user.id,
    venueId,
    action: "cjenik_create",
    outcome: "success",
    details: parsed.data.naziv,
  });

  return NextResponse.json({ cjenik });
});
