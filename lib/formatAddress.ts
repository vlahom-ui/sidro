interface VenueAddressFields {
  adresa: string;
  ulica: string | null;
  kucni_broj: string | null;
  grad: string | null;
}

/**
 * Strukturirana adresa (ulica/kućni broj/grad) precizno identificira objekt
 * (ista ulica postoji u više hrvatskih gradova) — kad su sva tri polja
 * popunjena, koristi se umjesto starog slobodnog teksta `adresa`. Objekti
 * kreirani prije uvođenja tih polja nemaju ih (namjerno, bez retroaktivnog
 * nagađanja), pa se za njih nastavlja prikazivati/koristiti stari `adresa`
 * tekst. Isti string se koristi i za prikaz i kao izvor za segment naziva
 * generirane datoteke (interpunkcija se ionako uklanja u normalizaciji ondje).
 */
export function formatVenueAddress(venue: VenueAddressFields): string {
  if (venue.ulica && venue.kucni_broj && venue.grad) {
    return `${venue.ulica} ${venue.kucni_broj}, ${venue.grad}`;
  }
  return venue.adresa;
}

export function hasCompleteStructuredAddress(
  venue: Pick<VenueAddressFields, "ulica" | "kucni_broj" | "grad">
): boolean {
  return Boolean(venue.ulica && venue.kucni_broj && venue.grad);
}
