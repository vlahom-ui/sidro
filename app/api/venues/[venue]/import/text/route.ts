import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertVenueOwner } from "@/lib/ownership";
import { applyDefaultTip, extractItemsFromText } from "@/lib/parsers/heuristics";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";
import { MAX_EXTRACTED_ITEMS } from "@/lib/security/fileValidation";
import { withErrorHandling } from "@/lib/apiRoute";

const bodySchema = z.object({
  text: z.string().min(1).max(200_000),
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

  const allowed = await checkRateLimit(supabase, "upload", RATE_LIMITS.upload);
  if (!allowed) {
    return NextResponse.json({ error: "Previše zahtjeva. Pokušajte kasnije." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Nevažeći podaci." }, { status: 400 });

  // Zalijepljeni tekst se tretira kao nepouzdan unos — samo se parsira kao plain text, nikad ne renderira kao HTML.
  const items = applyDefaultTip(
    extractItemsFromText(parsed.data.text).slice(0, MAX_EXTRACTED_ITEMS),
    venue.default_tip
  );

  const { data: importSource } = await supabase
    .from("import_sources")
    .insert({
      venue_id: venueId,
      source_type: "tekst",
      status: items.length > 0 ? "izvučeno — čeka pregled" : "nema prepoznatih stavki",
      method: "automatska ekstrakcija",
      item_count: items.length,
    })
    .select()
    .single();

  await logAudit({
    userId: user.id,
    venueId,
    action: "import_text",
    outcome: "success",
    details: `${items.length} stavki`,
  });

  return NextResponse.json({ importSourceId: importSource?.id, items });
});
