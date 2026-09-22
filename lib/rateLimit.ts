import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Provjerava i broji zahtjeve korisnika unutar fiksnog vremenskog prozora.
 * Koristi SQL funkciju check_and_increment_rate_limit (atomična, RLS-safe
 * jer se poziva service-role klijentom).
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  { windowSeconds, maxRequests }: { windowSeconds: number; maxRequests: number }
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("check_and_increment_rate_limit", {
    p_user_id: userId,
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
