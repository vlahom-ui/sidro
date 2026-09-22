export interface ExtractedItem {
  tip: "proizvod" | "usluga";
  naziv: string;
  cijena: number;
  kategorija?: string | null;
}

const PRICE_RE = /(\d{1,5}(?:[.,]\d{2}))(?!\d)(?:\s*(?:€|eur|kn))?\s*$/i;
const LEADER_DOTS_RE = /[.\-_ ]{2,}$/;
const PRODUCT_UNIT_RE = /\b(kg|g|dag|l|ml|kom|pak|kut)\b\.?\s*$/i;
const NOISE_LINE_RE = /^\s*(cjenik|jelovnik|meni|napomena|sadržaj|stranica \d+)\s*$/i;

function parsePrice(raw: string): number {
  return Number(raw.replace(",", "."));
}

/**
 * Heuristička ekstrakcija stavki iz plain-text sadržaja: traži retke oblika
 * "naziv ..... cijena" i klasificira tip proizvod/usluga po jedinici mjere.
 * Korisnik uvijek pregledava i ispravlja rezultat prije spremanja.
 */
export function extractItemsFromText(text: string): ExtractedItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !NOISE_LINE_RE.test(l));

  const items: ExtractedItem[] = [];
  let currentCategory: string | null = null;

  for (const line of lines) {
    const priceMatch = line.match(PRICE_RE);

    if (!priceMatch) {
      // Kratki redak bez cijene i bez malih slova na kraju tretiramo kao naslov kategorije.
      if (line.length <= 60 && line === line.toUpperCase() && /[A-ZČĆŠĐŽ]/.test(line)) {
        currentCategory = line;
      }
      continue;
    }

    const cijena = parsePrice(priceMatch[1]);
    if (!Number.isFinite(cijena) || cijena <= 0 || cijena > 100000) continue;

    let naziv = line.slice(0, priceMatch.index).replace(LEADER_DOTS_RE, "").trim();
    naziv = naziv.replace(/\s{2,}/g, " ");
    if (!naziv) continue;

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
