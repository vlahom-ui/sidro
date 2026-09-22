import type { Database } from "@/lib/database.types";

type Venue = Database["public"]["Tables"]["venues"]["Row"];
type Item = Database["public"]["Tables"]["items"]["Row"];

function offerFor(item: Item) {
  const additionalProperty = [];
  if (item.sidrena_cijena !== null) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "sidrena_cijena_10_9_2026",
      value: item.sidrena_cijena,
    });
  }

  const offer = {
    "@type": "Offer",
    price: item.cijena,
    priceCurrency: "EUR",
    ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
  };

  if (item.tip === "usluga") {
    return {
      "@type": "Service",
      name: item.naziv,
      ...(item.kategorija ? { category: item.kategorija } : {}),
      offers: offer,
    };
  }

  return {
    "@type": "Product",
    name: item.naziv,
    ...(item.marka ? { brand: { "@type": "Brand", name: item.marka } } : {}),
    ...(item.sifra ? { sku: item.sifra } : {}),
    ...(item.barkod ? { gtin: item.barkod } : {}),
    ...(item.url_slike ? { image: item.url_slike } : {}),
    ...(item.dostupnost
      ? {
          offers: {
            ...offer,
            availability:
              item.dostupnost === "dostupno" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }
      : { offers: offer }),
  };
}

export function buildJsonLd(venue: Venue, items: Item[]) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: venue.naziv,
    address: venue.adresa,
    ...(venue.oib ? { taxID: venue.oib } : {}),
    makesOffer: items.map(offerFor),
  };
}
