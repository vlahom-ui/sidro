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
    .select("id, owner_user_id, slug, naziv, oblik_objekta, adresa, default_tip, status")
    .eq("id", venueId)
    .maybeSingle();

  if (!venue || venue.owner_user_id !== userId) return null;
  return venue;
}

export async function assertCjenikOwner(
  supabase: SupabaseClient<Database>,
  cjenikId: string,
  userId: string
) {
  const { data: cjenik } = await supabase
    .from("cjenici")
    .select("*, venues!inner(owner_user_id)")
    .eq("id", cjenikId)
    .maybeSingle();

  if (!cjenik || (cjenik as unknown as { venues: { owner_user_id: string } }).venues.owner_user_id !== userId) {
    return null;
  }
  return cjenik;
}
