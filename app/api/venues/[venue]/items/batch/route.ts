import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertVenueOwner } from "@/lib/ownership";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/apiRoute";

const itemSchema = z.object({
  tip: z.enum(["proizvod", "usluga"]),
  naziv: z.string().min(1).max(300),
  cijena: z.coerce.number().nonnegative(),
  kategorija: z.string().max(200).nullable().optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(2000),
  cjenikId: z.string().uuid().nullable().optional(),
  // "add" — dodaj uz postojeće stavke (uz provjeru duplikata ispod).
  // "replace" — prvo obriši sve postojeće stavke ovog cjenika, pa dodaj nove
  // (korisnik svjesno bira ovo kad ponovno uvozi isti/ažurirani cjenik).
  mode: z.enum(["add", "replace"]).optional().default("add"),
  // Preskače provjeru duplikata — korisnik je već potvrdio "svejedno dodaj".
  force: z.boolean().optional().default(false),
});

function normalizeNaziv(naziv: string): string {
  return naziv.trim().toLowerCase();
}

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

  const { items, cjenikId, mode, force } = parsed.data;

  if (cjenikId) {
    const { data: cjenik } = await supabase
      .from("cjenici")
      .select("id")
      .eq("id", cjenikId)
      .eq("venue_id", venueId)
      .maybeSingle();
    if (!cjenik) return NextResponse.json({ error: "Cjenik nije pronađen." }, { status: 404 });
  }

  if (mode === "replace") {
    const query = supabase.from("items").delete().eq("venue_id", venueId);
    const { error: deleteError } = cjenikId ? await query.eq("cjenik_id", cjenikId) : await query.is("cjenik_id", null);
    if (deleteError) {
      return NextResponse.json({ error: "Brisanje postojećih stavki nije uspjelo." }, { status: 500 });
    }
  } else if (!force) {
    // Bug 2 zakrpa: privremena zaštita od tihog dupliciranja dok korisnik
    // svjesno ne odabere "dodaj svejedno" ili "zamijeni". Scope provjere je
    // odabrani cjenik (ili, za stavke bez cjenika, cijeli venue — postojeće
    // ponašanje prije uvođenja cjenika).
    const existingQuery = supabase.from("items").select("naziv, cijena").eq("venue_id", venueId);
    const { data: existing } = cjenikId
      ? await existingQuery.eq("cjenik_id", cjenikId)
      : await existingQuery.is("cjenik_id", null);

    const existingSet = new Set(
      (existing ?? []).map((e) => `${normalizeNaziv(e.naziv)}::${Math.round(e.cijena * 100)}`)
    );
    const duplicates = items
      .filter((i) => existingSet.has(`${normalizeNaziv(i.naziv)}::${Math.round(i.cijena * 100)}`))
      .map((i) => i.naziv);

    if (duplicates.length > 0) {
      return NextResponse.json(
        {
          error: "Ove stavke već postoje u cjeniku.",
          requiresConfirmation: true,
          duplicates,
        },
        { status: 409 }
      );
    }
  }

  const rows = items.map((i) => ({
    venue_id: venueId,
    tip: i.tip,
    naziv: i.naziv,
    cijena: i.cijena,
    // Nova stavka: sidrena cijena = trenutna cijena dok korisnik ne kaže
    // drugačije (usklađeno s pravilom "prva cijena nakon 10.9.2026. = sidrena").
    sidrena_cijena: i.cijena,
    kategorija: i.kategorija ?? null,
    cjenik_id: cjenikId ?? null,
  }));

  const { data: inserted, error } = await supabase.from("items").insert(rows).select();
  if (error) {
    console.error("items/batch insert nije uspio:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json({ error: "Spremanje nije uspjelo." }, { status: 500 });
  }

  await logAudit({
    userId: user.id,
    venueId,
    action: "item_bulk_update",
    outcome: "success",
    details: `${mode === "replace" ? "Zamijenjeno" : "Uvezeno i spremljeno"} ${inserted?.length ?? 0} stavki`,
  });

  return NextResponse.json({ items: inserted, count: inserted?.length ?? 0 });
});
