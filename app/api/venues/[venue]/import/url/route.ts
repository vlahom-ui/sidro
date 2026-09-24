import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertVenueOwner } from "@/lib/ownership";
import { safeFetchText, SsrfBlockedError } from "@/lib/security/ssrf";
import { applyDefaultTip, extractItemsFromText, htmlToPlainText } from "@/lib/parsers/heuristics";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";
import { MAX_EXTRACTED_ITEMS } from "@/lib/security/fileValidation";
import { withErrorHandling } from "@/lib/apiRoute";

const bodySchema = z.object({
  urls: z.array(z.string().url()).min(1).max(3),
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

  const allowed = await checkRateLimit(supabase, "url_import", RATE_LIMITS.urlImport);
  if (!allowed) {
    return NextResponse.json({ error: "Previše zahtjeva. Pokušajte kasnije." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Nevažeći podaci (maks. 3 URL-a)." }, { status: 400 });

  const results: { url: string; count: number; error?: string }[] = [];
  let allItems = [];

  for (const url of parsed.data.urls) {
    try {
      const html = await safeFetchText(url);
      const text = htmlToPlainText(html);
      const items = extractItemsFromText(text).slice(0, MAX_EXTRACTED_ITEMS);
      allItems.push(...items);
      results.push({ url, count: items.length });
    } catch (err) {
      const message = err instanceof SsrfBlockedError ? err.message : "Dohvat nije uspio.";
      results.push({ url, count: 0, error: message });
    }
  }

  allItems = applyDefaultTip(allItems, venue.default_tip);

  const { data: importSource } = await supabase
    .from("import_sources")
    .insert({
      venue_id: venueId,
      source_type: "url",
      status: allItems.length > 0 ? "izvučeno — čeka pregled" : "nema prepoznatih stavki",
      method: "automatska ekstrakcija",
      item_count: allItems.length,
    })
    .select()
    .single();

  await logAudit({
    userId: user.id,
    venueId,
    action: "import_url",
    outcome: allItems.length > 0 ? "success" : "failure",
    details: JSON.stringify(results),
  });

  return NextResponse.json({ importSourceId: importSource?.id, items: allItems, results });
});
