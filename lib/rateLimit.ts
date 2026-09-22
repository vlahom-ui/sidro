import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Provjerava i broji zahtjeve korisnika unutar fiksnog vremenskog prozora.
 * Koristi SQL funkciju check_and_increment_rate_limit, koja interno uzima
 * auth.uid() iz sesije pozivatelja (SECURITY DEFINER + auth.uid() provjera
 * unutar funkcije) — zato MORA primiti klijent koji nosi korisnikovu
 * sesiju/JWT (npr. iz lib/supabase/server.ts), nikad admin/service-role
 * klijent, koji nema auth.uid() kontekst i uzrokovao bi da funkcija baci
 * grešku "authentication required".
 */
export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  action: string,
  { windowSeconds, maxRequests }: { windowSeconds: number; maxRequests: number }
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_and_increment_rate_limit", {
    p_action: action,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });

  if (error) {
    // Fail closed za sigurnosno osjetljive akcije (upload/import).
    return false;
  }

  return Boolean(data);
}

export const RATE_LIMITS = {
  upload: { windowSeconds: 3600, maxRequests: 20 },
  urlImport: { windowSeconds: 3600, maxRequests: 20 },
  generate: { windowSeconds: 3600, maxRequests: 30 },
} as const;
