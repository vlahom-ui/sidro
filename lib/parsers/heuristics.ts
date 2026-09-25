export interface ExtractedItem {
  tip: "proizvod" | "usluga";
  naziv: string;
  cijena: number;
  kategorija?: string | null;
  /**
   * True samo kad je tip eksplicitno naveden u izvornim podacima (npr. CSV/
   * XML/XLSX stupac "tip"/"vrsta"), ne pogođen heuristikom. applyDefaultTip
   * ne smije prepisati eksplicitno naveden tip — to bi tiho izbrisalo
   * namjerno unesen podatak korisnika.
   */
  tipExplicit?: boolean;
  /**
   * True kad je naziv "3-retka" obrasca (naziv/opis/cijena na odvojenim
   * retcima) pogođen BEZ pouzdanog CAPS signala — tada se koristi najbliži
   * prethodni redak kao naziv, ali kad ni taj ni redak iznad njega nisu
   * CAPS, nema pouzdanog načina razlikovati "ovo je naziv" od "ovo je opis
   * ispod naziva" (npr. "Miješana Stavka test" / "Opis bez velikih slova u
   * naslovu" / "18 €" — bez CAPS-a strukturno neразличиве). Radije uvijek
   * nešto pogodi nego stavku tiho izgubi (korisnik lakše ispravi vidljivo
   * krivi naziv nego primijeti da mu redak posve nedostaje u dugom popisu),
   * ali UI mora to jasno označiti da korisnik zna gdje posebno provjeriti.
   */
  nameUncertain?: boolean;
}

// Cijena s decimalama ne treba valutnu oznaku (npr. "12,50"), ali cijena bez
// decimala MORA imati oznaku valute (npr. "35 €", "50 kn") — bez toga bi
// svaki broj na kraju retka (količina, broj stranice...) lažno prošao kao cijena.
// Isto pravilo vrijedi za europski format tisućica (točka kao razdjelnik
// tisućica, npr. "1.195 €"): bez decimalnog zareza mora imati valutu; s
// decimalnim zarezom (npr. "1.195,50 €") ne treba, analogno običnom
// decimalnom zapisu. Redoslijed alternacija ide od najspecifičnije prema
// najmanje specifičnoj da "1.195,50" ne bude pogrešno razbijen na "1" +
// ostatak od strane šireg, manje specifičnog obrasca.
const PRICE_RE =
  /(\d{1,3}(?:\.\d{3})+,\d{2}|\d{1,5}(?:[.,]\d{2})|\d{1,3}(?:\.\d{3})+(?=\s*(?:€|eur|kn))|\d{1,5}(?=\s*(?:€|eur|kn)))(?!\d)(?:\s*(?:€|eur|kn))?\s*$/i;
// Razdjelnik između naziva i cijene NA ISTOM retku — ili niz od 2+ "leader
// dots"/crtica/podvlaka (npr. "Espresso ..... 2,00 €"), ili JEDAN znak
// tipičnog razdjelnika (crtica, en-dash, em-dash, dvotočka, elipsa) okružen
// proizvoljnim razmacima (npr. "Limoncello Spritz — 12,90 €", vrlo čest
// obrazac na stvarnim hrvatskim jelovnicima). Bez em/en-dash u skupu ostaje
// zalijepljen na kraj naziva jer .trim() briše samo whitespace, ne
// interpunkciju — potvrđeno stvarnim produkcijskim podatkom (199/199
// stavki na jednom objektu).
const TRAILING_SEPARATOR_RE = /\s*(?:[.\-_]{2,}|[-–—:…])\s*$/;
const PRODUCT_UNIT_RE = /\b(kg|g|dag|l|ml|kom|pak|kut)\b\.?\s*$/i;
const NOISE_LINE_RE = /^\s*(cjenik|jelovnik|meni|napomena|sadržaj|stranica \d+)\s*$/i;
// Redak koji izgleda kao naslov dokumenta (npr. "CJENIK IZLETA 2026",
// "JELOVNIK 2026") — širi od NOISE_LINE_RE gore (koji hvata SAMO čisto
// "cjenik"/"jelovnik" bez ičega drugoga). Koristi se isključivo da se takav
// redak isključi iz kandidata za NAZIV stavke u lookback logici ispod (nikad
// kao opći pre-filter, jer bi to moglo slučajno pojesti pravu stavku poput
// "Meni degustacija 45,00 €" koja sadrži riječ "meni" ALI i cijenu — ovaj
// regex se zato primjenjuje samo na retke za koje je već utvrđeno da NEMAJU
// cijenu).
const TITLE_LINE_RE = /^\s*(cjenik|jelovnik|meni|price\s*list|menu)\b/i;

// Europski format tisućica: grupe od TOČNO 3 znamenke odvojene točkom (npr.
// "1.195"), za razliku od običnog decimalnog zapisa koji ima točno 2
// znamenke nakon separatora (npr. "35.00"). Ta razlika u duljini je ono što
// razlikuje "razdjelnik tisućica" od "decimalni separator" bez dvoznačnosti.
const THOUSANDS_ONLY_RE = /^\d{1,3}(\.\d{3})+$/;

function parsePrice(raw: string): number {
  if (raw.includes(",")) {
    // Zarez je decimalni separator — sve točke prije njega su razdjelnici tisućica.
    return Number(raw.replace(/\./g, "").replace(",", "."));
  }
  if (THOUSANDS_ONLY_RE.test(raw)) {
    return Number(raw.replace(/\./g, ""));
  }
  return Number(raw.replace(",", "."));
}

function isCapsLine(line: string): boolean {
  return line.length <= 60 && line === line.toUpperCase() && /[A-ZČĆŠĐŽ]/.test(line);
}

/**
 * Heuristička ekstrakcija stavki iz plain-text sadržaja. Podržava tri čest
 * oblika jelovnika:
 *  1) "naziv ..... cijena" na istom retku (npr. "Espresso 2,00 €")
 *  2) NAZIV (caps) / cijena na dva odvojena retka, ili NAZIV (caps) / opis /
 *     cijena na tri odvojena retka — čest kod kopiranog teksta iz PDF-a s
 *     desno poravnatim cijenama, gdje se naziv, opis i cijena razbiju u
 *     zasebne retke. Naziv se traži TOČNO jedan ili dva retka iznad cijene
 *     (ne dalje — širi lookback bi mogao pogrešno pokupiti naslov dokumenta
 *     ili naziv PRETHODNE, nepovezane stavke kao naziv trenutne).
 *  3) Naziv (obično malim/mixed-case slovima, bez posebne stilizacije) /
 *     cijena na dva odvojena retka — čest kod OCR-a fotografija i
 *     jednostavnih popisa bez CAPS naslova. Kad ni redak iznad cijene ni
 *     redak dva iznad nisu prepoznati kao pouzdan CAPS naziv, najbliži
 *     prethodni redak (koji nije ni cijena ni naslov dokumenta poput
 *     "CJENIK ...") se svejedno koristi kao naziv, bez obzira na veliko/malo
 *     slovo — bolje približan naziv nego tiho izgubljena stavka.
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
  // retku), rezerviraj naziv s jednog od (najviše) dva prethodna retka.
  const consumedAsName = new Set<number>();
  // Podskup consumedAsName gdje je naziv pogođen BEZ pouzdanog CAPS signala
  // (obrazac 3 ispod) — UI mora ovo istaknuti jer je stvarno dvosmisleno
  // (vidi opis nameUncertain u ExtractedItem).
  const uncertainName = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.priceMatch) continue;
    const inlineNaziv = line.text.slice(0, line.priceMatch.index).replace(TRAILING_SEPARATOR_RE, "").trim();
    if (inlineNaziv) continue;

    const prev1 = i - 1 >= 0 ? lines[i - 1] : null;
    const prev2 = i - 2 >= 0 ? lines[i - 2] : null;
    const isUsableCapsName = (l: (typeof lines)[number]) => l.isCaps && !TITLE_LINE_RE.test(l.text);

    if (prev1 && !prev1.priceMatch && !consumedAsName.has(i - 1)) {
      if (isUsableCapsName(prev1)) {
        // Obrazac 2 (dva retka): NAZIV (caps) / cijena.
        consumedAsName.add(i - 1);
      } else if (prev2 && !prev2.priceMatch && isUsableCapsName(prev2) && !consumedAsName.has(i - 2)) {
        // Obrazac 2 (tri retka): NAZIV (caps) / opis / cijena.
        consumedAsName.add(i - 2);
      } else if (!TITLE_LINE_RE.test(prev1.text)) {
        // Obrazac 3: nema pouzdanog CAPS kandidata u blizini — koristi
        // najbliži prethodni redak kakav god bio (osim ako je i on sam
        // naslov dokumenta, u kojem slučaju je bolje ne pogoditi naziv nego
        // pogriješiti). Kad postoji redak dva iznad (prev2) koji bi TEORETSKI
        // mogao biti stvarni naziv (npr. "Naziv / opis / cijena" bez CAPS-a
        // na bilo kojem retku), nema pouzdanog načina znati je li prev1 ili
        // prev2 točan — označi kao nesigurno da korisnik zna provjeriti.
        consumedAsName.add(i - 1);
        if (prev2 && !prev2.priceMatch) uncertainName.add(i - 1);
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

    let naziv = line.text.slice(0, line.priceMatch.index).replace(TRAILING_SEPARATOR_RE, "").trim();
    naziv = naziv.replace(/\s{2,}/g, " ");
    let nameUncertain = false;
    if (!naziv && pendingNameIndex !== null) {
      naziv = lines[pendingNameIndex].text;
      nameUncertain = uncertainName.has(pendingNameIndex);
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
      ...(nameUncertain ? { nameUncertain: true } : {}),
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
  return items.map((item) => (item.tipExplicit ? item : { ...item, tip: defaultTip }));
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
