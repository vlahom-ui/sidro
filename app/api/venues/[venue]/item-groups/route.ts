import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertVenueOwner } from "@/lib/ownership";
import { composeVariantName } from "@/lib/itemGroups";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/apiRoute";

const variantSchema = z.object({
  label: z.string().min(1).max(200),
  cijena: z.coerce.number().positive(),
});

const bodySchema = z.object({
  tip: z.enum(["proizvod", "usluga"]),
  naziv: z.string().min(1).max(200),
  opis: z.string().max(2000).nullable().optional(),
  trajanje: z.string().max(100).nullable().optional(),
  // Sigurnosna gornja granica — sprječava da jedan zahtjev pokuša odjednom
  // upisati nerazumno velik broj redaka (npr. neispravno generirana 2D matrica).
  variants: z.array(variantSchema).min(1).max(200),
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

  const { tip, naziv, opis, trajanje, variants } = parsed.data;

  const { data: group, error: groupError } = await supabase
    .from("item_groups")
    .insert({
      venue_id: venueId,
      tip,
      naziv,
      opis: opis || null,
      trajanje: trajanje || null,
    })
    .select()
    .single();

  if (groupError || !group) {
    return NextResponse.json({ error: "Stvaranje grupe nije uspjelo." }, { status: 500 });
  }

  const rows = variants.map((v) => ({
    venue_id: venueId,
    tip,
    naziv: composeVariantName(naziv, v.label),
    cijena: v.cijena,
    // Nova stavka: sidrena cijena = trenutna cijena dok korisnik ne kaže drugačije.
    sidrena_cijena: v.cijena,
    item_group_id: group.id,
    variant_label: v.label,
  }));

  const { data: inserted, error: itemsError } = await supabase.from("items").insert(rows).select();

  if (itemsError || !inserted) {
    console.error("item-groups insert varijanti nije uspio:", {
      code: itemsError?.code,
      message: itemsError?.message,
      details: itemsError?.details,
      hint: itemsError?.hint,
    });
    // Kompenzacijski rollback — bez osirotjele grupe bez ijedne varijante.
    await supabase.from("item_groups").delete().eq("id", group.id);
    return NextResponse.json({ error: "Spremanje varijanti nije uspjelo." }, { status: 500 });
  }

  await logAudit({
    userId: user.id,
    venueId,
    action: "item_group_create",
    outcome: "success",
    details: `"${naziv}" — ${inserted.length} varijanti`,
  });

  return NextResponse.json({ group, items: inserted });
});
