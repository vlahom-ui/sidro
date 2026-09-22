import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { itemInputSchema } from "@/lib/itemSchema";

async function loadOwnedItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  userId: string
) {
  const { data: item } = await supabase
    .from("items")
    .select("*, venues!inner(owner_user_id)")
    .eq("id", itemId)
    .maybeSingle();

  if (!item || (item as unknown as { venues: { owner_user_id: string } }).venues.owner_user_id !== userId) {
    return null;
  }
  return item;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ item: string }> }
) {
  const { item: itemId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });

  const existing = await loadOwnedItem(supabase, itemId, user.id);
  if (!existing) return NextResponse.json({ error: "Nije pronađeno." }, { status: 404 });

  const json = await request.json().catch(() => null);
  const parsed = itemInputSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Nevažeći podaci." }, { status: 400 });

  const d = parsed.data;
  const { data: item, error } = await supabase
    .from("items")
    .update({
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
    .eq("id", itemId)
    .select()
    .single();

  if (error || !item) return NextResponse.json({ error: "Spremanje nije uspjelo." }, { status: 500 });
  return NextResponse.json({ item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ item: string }> }
) {
  const { item: itemId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });

  const existing = await loadOwnedItem(supabase, itemId, user.id);
  if (!existing) return NextResponse.json({ error: "Nije pronađeno." }, { status: 404 });

  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) return NextResponse.json({ error: "Brisanje nije uspjelo." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
