import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/apiRoute";

const bodySchema = z.object({
  password: z.string().min(1),
});

export const DELETE = withErrorHandling(async (request: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Nevažeći podaci." }, { status: 400 });

  // Ponovna autentikacija lozinkom, isti obrazac kao ChangePasswordForm —
  // sesijski cookie sam po sebi ne dokazuje da je upravo SADA korisnik za
  // računalom, a ovo je nepovratna akcija.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (reauthError) return NextResponse.json({ error: "Lozinka nije ispravna." }, { status: 401 });

  const { data: venues } = await supabase.from("venues").select("id").eq("owner_user_id", user.id);
  const venueIds = (venues ?? []).map((v) => v.id);

  const { count: itemCount } = venueIds.length
    ? await supabase.from("items").select("id", { count: "exact", head: true }).in("venue_id", venueIds)
    : { count: 0 };

  // audit_log nema cascade prema venues (on delete set null) niti ikakav FK
  // prema auth.users (user_id je goli uuid) — oba slučaja treba obrisati
  // ručno PRIJE brisanja korisnika, dok se retci još mogu jednoznačno naći.
  if (venueIds.length) {
    await supabase.from("audit_log").delete().in("venue_id", venueIds);
  }
  await supabase.from("audit_log").delete().eq("user_id", user.id);

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: "Brisanje računa nije uspjelo." }, { status: 500 });
  }

  // Brisanje auth.users retka povlači cascade (FK on delete cascade) brisanje
  // svih venues korisnika (pa time i items/item_groups/price_history/cjenici/
  // import_sources/generated_files/image_candidates preko venue_id) te
  // consents (preko user_id) — bez potrebe za ručnim brisanjem tih tablica.

  await logAudit({
    userId: user.id,
    action: "account_delete",
    outcome: "success",
    details: `${user.email} — ${venueIds.length} objekata, ${itemCount ?? 0} stavki obrisano`,
  });

  return NextResponse.json({ ok: true, deletedVenueCount: venueIds.length, deletedItemCount: itemCount ?? 0 });
});
