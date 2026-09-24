import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export async function assertVenueOwner(
  supabase: SupabaseClient<Database>,
  venueId: string,
  userId: string
) {
  const { data: venue } = await supabase
    .from("venues")
    .select("id, owner_user_id, slug, naziv, oblik_objekta, adresa, default_tip")
    .eq("id", venueId)
    .maybeSingle();

  if (!venue || venue.owner_user_id !== userId) return null;
  return venue;
}
