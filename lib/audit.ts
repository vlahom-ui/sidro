import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function logAudit(entry: {
  userId?: string | null;
  venueId?: string | null;
  action: string;
  outcome: "success" | "failure";
  details?: string;
}) {
  const supabase = createAdminClient();
  await supabase.from("audit_log").insert({
    user_id: entry.userId ?? null,
    venue_id: entry.venueId ?? null,
    action: entry.action,
    outcome: entry.outcome,
    details: entry.details ?? null,
  });
}
