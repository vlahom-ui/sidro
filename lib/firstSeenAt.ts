import "server-only";
import type { VenueStatus } from "@/lib/database.types";

/**
 * Zakonski relevantan datum "prvog pojavljivanja" stavke je kad stvarno
 * postane vidljiva javnosti, ne kad je administrator utipkao podatke.
 * Objekt već objavljen → stavka je odmah u ponudi. Objekt još draft →
 * datum se ne zna dok se objekt ne objavi (postavlja ga publish ruta,
 * bulk, za sve stavke kojima je first_seen_at još null).
 */
export function computeFirstSeenAt(venueStatus: VenueStatus): string | null {
  return venueStatus === "published" ? new Date().toISOString() : null;
}
