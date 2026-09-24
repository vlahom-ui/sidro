import type { Database } from "@/lib/database.types";

type Venue = Database["public"]["Tables"]["venues"]["Row"];
type Item = Database["public"]["Tables"]["items"]["Row"];
type ItemGroup = Database["public"]["Tables"]["item_groups"]["Row"];

/** Goli Offer za jednu prodajnu stavku (varijantu), bez omatanja u Service/Product. */
function bareOffer(item: Item) {
  const additionalProperty = [];
  if (item.sidrena_cijena !== null) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "sidrena_cijena_10_9_2026",
      value: item.sidrena_cijena,
    });
  }

  return {
    "@type": "Offer",
    ...(item.variant_label ? { name: item.variant_label } : {}),
    price: item.cijena,
    priceCurrency: "EUR",
    ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
  };
}

/** Negrupirana stavka — identično ponašanje kao prije uvođenja grupiranja. */
function entityForSingleItem(item: Item) {
  const offer = bareOffer(item);

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

/** Grupirana usluga/proizvod — jedan entitet, po jedan Offer po varijanti. */
function entityForGroup(group: ItemGroup, variants: Item[]) {
  const offers = variants.map(bareOffer);
  const type = group.tip === "usluga" ? "Service" : "Product";

  return {
    "@type": type,
    name: group.naziv,
    ...(group.opis ? { description: group.opis } : {}),
    offers,
  };
}

export function buildJsonLd(venue: Venue, items: Item[], groups: ItemGroup[] = []) {
  const variantsByGroupId = new Map<string, Item[]>();
  const ungrouped: Item[] = [];
  for (const item of items) {
    if (item.item_group_id) {
      const arr = variantsByGroupId.get(item.item_group_id) ?? [];
      arr.push(item);
      variantsByGroupId.set(item.item_group_id, arr);
    } else {
      ungrouped.push(item);
    }
  }

  const groupEntities = groups
    .map((g) => {
      const variants = variantsByGroupId.get(g.id);
      if (!variants || variants.length === 0) return null;
      return entityForGroup(g, variants);
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const ungroupedEntities = ungrouped.map(entityForSingleItem);

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: venue.naziv,
    address: venue.adresa,
    ...(venue.oib ? { taxID: venue.oib } : {}),
    makesOffer: [...groupEntities, ...ungroupedEntities],
  };
}
