import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/apiRoute";

const bodySchema = z.object({
  naziv: z.string().min(1).max(200),
  podkategorijaId: z.string().uuid(),
  adresa: z.string().min(1).max(300),
  oib: z.string().max(20).optional().nullable(),
  defaultTip: z.enum(["proizvod", "usluga"]).optional().nullable(),
});

export const POST = withErrorHandling(async (request: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nevažeći podaci." }, { status: 400 });
  }

  const { naziv, podkategorijaId, adresa, oib, defaultTip } = parsed.data;

  // Podkategorija se ne uzima na vjeru s klijenta — dohvat servera je izvor
  // istine za oblik_objekta tekst (Sidrova interna kategorizacija, ne
  // službeni šifrarnik — vidi napomenu uz polje na formi).
  const { data: podkategorija } = await supabase
    .from("venue_podkategorije")
    .select("id, naziv")
    .eq("id", podkategorijaId)
    .maybeSingle();

  if (!podkategorija) {
    return NextResponse.json({ error: "Nevažeća kategorija objekta." }, { status: 400 });
  }

  const admin = createAdminClient();
  const baseSlug = slugify(naziv) || "objekt";
  let slug = baseSlug;
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data: existing } = await admin.from("venues").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: venue, error } = await supabase
    .from("venues")
    .insert({
      owner_user_id: user.id,
      naziv,
      slug,
      oblik_objekta: podkategorija.naziv,
      adresa,
      oib: oib || null,
      status: "draft",
      default_tip: defaultTip ?? null,
      podkategorija_id: podkategorija.id,
    })
    .select()
    .single();

  if (error || !venue) {
    await logAudit({ userId: user.id, action: "venue_create", outcome: "failure", details: error?.message });
    return NextResponse.json({ error: "Stvaranje objekta nije uspjelo." }, { status: 500 });
  }

  await logAudit({ userId: user.id, venueId: venue.id, action: "venue_create", outcome: "success" });

  return NextResponse.json({ venue });
});
