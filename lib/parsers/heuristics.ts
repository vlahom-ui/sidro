export interface ExtractedItem {
  tip: "proizvod" | "usluga";
  naziv: string;
  cijena: number;
  kategorija?: string | null;
}

// Cijena s decimalama ne treba valutnu oznaku (npr. "12,50"), ali cijena bez
// decimala MORA imati oznaku valute (npr. "35 €", "50 kn") — bez toga bi
// svaki broj na kraju retka (količina, broj stranice...) lažno prošao kao cijena.
const PRICE_RE = /(\d{1,5}(?:[.,]\d{2})|\d{1,5}(?=\s*(?:€|eur|kn)))(?!\d)(?:\s*(?:€|eur|kn))?\s*$/i;
const LEADER_DOTS_RE = /[.\-_ ]{2,}$/;
const PRODUCT_UNIT_RE = /\b(kg|g|dag|l|ml|kom|pak|kut)\b\.?\s*$/i;
const NOISE_LINE_RE = /^\s*(cjenik|jelovnik|meni|napomena|sadržaj|stranica \d+)\s*$/i;

function parsePrice(raw: string): number {
  return Number(raw.replace(",", "."));
}

function isCapsLine(line: string): boolean {
  return line.length <= 60 && line === line.toUpperCase() && /[A-ZČĆŠĐŽ]/.test(line);
}

const MAX_NAME_LOOKBACK = 4;

/**
 * Heuristička ekstrakcija stavki iz plain-text sadržaja. Podržava dva čest
 * oblika jelovnika:
 *  1) "naziv ..... cijena" na istom retku (npr. "Espresso 2,00 €")
 *  2) NAZIV (caps) / opis / cijena na tri odvojena retka — čest kod
 *     kopiranog teksta iz PDF-a s desno poravnatim cijenama, gdje se naziv,
 *     opis i cijena razbiju u zasebne retke. U tom slučaju retak s cijenom
 *     nema svoj naziv na istom retku, pa se traži najbliži prethodni
 *     CAPS redak (prije bilo kojeg ranijeg retka s cijenom) i koristi kao
 *     naziv stavke.
 * Klasificira tip proizvod/usluga po jedinici mjere. Korisnik uvijek
 * pregledava i ispravlja rezultat prije spremanja.
 */
export function extractItemsFromText(text: string): ExtractedItem[] {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !NOISE_LINE_RE.test(l));

  const lines = rawLines.map((l) => ({
    text: l,
    priceMatch: l.match(PRICE_RE),
    isCaps: isCapsLine(l),
  }));

  // Prvi prolaz: za retke koji sadrže SAMO cijenu (nema naziva na istom
  // retku), rezerviraj najbliži prethodni CAPS redak kao naziv te stavke.
  const consumedAsName = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.priceMatch) continue;
    const inlineNaziv = line.text.slice(0, line.priceMatch.index).replace(LEADER_DOTS_RE, "").trim();
    if (inlineNaziv) continue;

    for (let back = i - 1, steps = 0; back >= 0 && steps < MAX_NAME_LOOKBACK; back--, steps++) {
      const candidate = lines[back];
      if (candidate.priceMatch) break; // prethodna stavka — ne idi dalje unatrag
      if (candidate.isCaps && !consumedAsName.has(back)) {
        consumedAsName.add(back);
        break;
      }
    }
  }

  const items: ExtractedItem[] = [];
  let currentCategory: string | null = null;
  let pendingNameIndex: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (consumedAsName.has(i)) {
      pendingNameIndex = i;
      continue;
    }

    if (!line.priceMatch) {
      // Kratki redak bez cijene, u caps-u, koji nije iskorišten kao naziv stavke — naslov kategorije.
      if (line.isCaps) currentCategory = line.text;
      continue;
    }

    let naziv = line.text.slice(0, line.priceMatch.index).replace(LEADER_DOTS_RE, "").trim();
    naziv = naziv.replace(/\s{2,}/g, " ");
    if (!naziv && pendingNameIndex !== null) {
      naziv = lines[pendingNameIndex].text;
    }
    pendingNameIndex = null;
    if (!naziv) continue;

    const cijena = parsePrice(line.priceMatch[1]);
    if (!Number.isFinite(cijena) || cijena <= 0 || cijena > 100000) continue;

    const tip: ExtractedItem["tip"] = PRODUCT_UNIT_RE.test(naziv) ? "proizvod" : "usluga";

    items.push({
      tip,
      naziv: naziv.slice(0, 300),
      cijena,
      kategorija: currentCategory,
    });
  }

  return items;
}

/**
 * Primjenjuje objekt-razinski default tip (venues.default_tip) na sve
 * izvučene stavke iz uvoza, umjesto oslanjanja isključivo na heuristiku
 * (PRODUCT_UNIT_RE) koja bez dodatnog konteksta pretpostavlja "usluga".
 * Kad default_tip nije postavljen za objekt, ponašanje ostaje nepromijenjeno.
 */
export function applyDefaultTip(
  items: ExtractedItem[],
  defaultTip: ExtractedItem["tip"] | null | undefined
): ExtractedItem[] {
  if (!defaultTip) return items;
  return items.map((item) => ({ ...item, tip: defaultTip }));
}

/** Skida HTML oznake i pretvara u plain text pogodan za extractItemsFromText. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "\n")
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&euro;/g, "€")
    .replace(/[ \t]{2,}/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}
