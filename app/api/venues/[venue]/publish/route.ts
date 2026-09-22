import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({ status: z.enum(["draft", "published"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venue: string }> }
) {
  const { venue: venueId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Nevažeći podaci." }, { status: 400 });

  const { data: venue, error } = await supabase
    .from("venues")
    .update({ status: parsed.data.status })
    .eq("id", venueId)
    .select()
    .single();

  if (error || !venue) {
    return NextResponse.json({ error: "Ažuriranje nije uspjelo." }, { status: 500 });
  }

  await logAudit({
    userId: user.id,
    venueId: venue.id,
    action: parsed.data.status === "published" ? "venue_publish" : "venue_unpublish",
    outcome: "success",
  });

  return NextResponse.json({ venue });
}
