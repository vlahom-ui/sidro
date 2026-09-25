import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/apiRoute";

const bodySchema = z.object({
  naziv: z.string().min(1).max(200),
  oblikObjekta: z.string().min(1).max(100),
  ulica: z.string().min(1).max(150),
  kucniBroj: z.string().min(1).max(20),
  grad: z.string().min(1).max(100),
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

  const { naziv, oblikObjekta, ulica, kucniBroj, grad, oib, defaultTip } = parsed.data;
  // adresa (stari slobodni tekst) i dalje postoji radi svih postojećih
  // mjesta u kodu koja ga čitaju kao siguran fallback — za nove objekte
  // sastavljen je izravno iz strukturiranih polja, isti format kao prikaz
  // ("Ulica Kućni broj, Grad" — vidi lib/formatAddress.ts).
  const adresa = `${ulica} ${kucniBroj}, ${grad}`;

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
      oblik_objekta: oblikObjekta,
      adresa,
      ulica,
      kucni_broj: kucniBroj,
      grad,
      oib: oib || null,
      status: "draft",
      default_tip: defaultTip ?? null,
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
