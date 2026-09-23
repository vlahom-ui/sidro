import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertVenueOwner } from "@/lib/ownership";
import { itemInputSchema } from "@/lib/itemSchema";
import { withErrorHandling } from "@/lib/apiRoute";

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
  const parsed = itemInputSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Nevažeći podaci." }, { status: 400 });

  const d = parsed.data;
  const { data: item, error } = await supabase
    .from("items")
    .insert({
      venue_id: venueId,
      tip: d.tip,
      naziv: d.naziv,
      cijena: d.cijena,
      sidrena_cijena: d.sidrenaCijena ?? null,
      url_slike: d.urlSlike,
      kategorija: d.kategorija ?? null,
      poseban_oblik_prodaje: d.posebanOblikProdaje ?? false,
      naziv_posebnog_oblika: d.nazivPosebnogOblika ?? null,
      sifra: d.sifra,
      marka: d.marka,
      jedinica_mjere: d.jedinicaMjere,
      cijena_po_jedinici: d.cijenaPoJedinici,
      barkod: d.barkod,
      dostupnost: d.dostupnost,
    })
    .select()
    .single();

  if (error || !item) {
    return NextResponse.json({ error: "Spremanje nije uspjelo." }, { status: 500 });
  }

  return NextResponse.json({ item });
});
