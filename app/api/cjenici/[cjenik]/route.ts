import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertCjenikOwner } from "@/lib/ownership";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/apiRoute";

export const DELETE = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ cjenik: string }> }
) => {
  const { cjenik: cjenikId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });

  const cjenik = await assertCjenikOwner(supabase, cjenikId, user.id);
  if (!cjenik) return NextResponse.json({ error: "Nije pronađeno." }, { status: 404 });

  // Brojimo stavke PRIJE brisanja radi audit zapisa — sam DELETE na cjenici
  // retku briše ih preko on delete cascade FK-a, bez dodatnog koraka ovdje.
  const { count } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("cjenik_id", cjenikId);

  const { error } = await supabase.from("cjenici").delete().eq("id", cjenikId);
  if (error) return NextResponse.json({ error: "Brisanje nije uspjelo." }, { status: 500 });

  await logAudit({
    userId: user.id,
    venueId: cjenik.venue_id,
    action: "cjenik_delete",
    outcome: "success",
    details: `"${cjenik.naziv}" — ${count ?? 0} stavki obrisano`,
  });

  return NextResponse.json({ ok: true, deletedItemCount: count ?? 0 });
});
