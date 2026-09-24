/**
 * Sastavlja finalni items.naziv za varijantu unutar grupe — isti obrazac
 * kao ranije ručno rađeno za Villa Dubrovnik CSV. Osigurava da CSV/XML
 * izvoz (koji čita samo items.naziv) ostane potpuno nepromijenjen u
 * strukturi bez obzira na grupiranje.
 */
export function composeVariantName(groupNaziv: string, variantLabel: string): string {
  return `${groupNaziv} - ${variantLabel}`.slice(0, 300);
}
