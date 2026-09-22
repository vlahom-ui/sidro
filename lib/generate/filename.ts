// Format naziva generirane datoteke slijedi HOK-ov referentni primjer
// (Odluka o objavi cjenika, NN 101/2026, ne propisuje strogu sintaksu,
// samo redoslijed elemenata):
//   {OBLIK}_{ADRESA}_{OZNAKA}_{BROJ_POHRANE}_{YYYYMMDD}_{HHMM}.{csv|xml}
// npr. TRG_ZAGREBACKA10_001_0001_20261001_0755.csv

const CROATIAN_DIACRITIC_MAP: Record<string, string> = {
  č: "c",
  ć: "c",
  š: "s",
  ž: "z",
  đ: "dj",
};

const MAX_SEGMENT_LENGTH = 30;
const EMPTY_SEGMENT_PLACEHOLDER = "NEPOZNATO";

export const GENERATED_FILENAME_RE = /^[A-Z0-9]+_[A-Z0-9]+_\d{3}_\d{4}_\d{8}_\d{4}\.(csv|xml)$/;

/**
 * Normalizira slobodni tekst (oblik objekta, adresa) u segment naziva
 * datoteke: uklanja hrvatske dijakritike (č/ć→c, š→s, ž→z, đ→dj), zatim sve
 * preostale (npr. njemačke/talijanske) dijakritičke znakove, uppercase, i
 * potpuno uklanja sve što nije [A-Z0-9] — bez zamjene podcrtajem, da se
 * izbjegnu dvostruki/trostruki "_" u nazivu.
 */
function normalizeSegment(input: string, maxLength = MAX_SEGMENT_LENGTH): string {
  let result = input.toLowerCase();
  for (const [from, to] of Object.entries(CROATIAN_DIACRITIC_MAP)) {
    result = result.split(from).join(to);
  }
  result = result.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  result = result.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return result.slice(0, maxLength);
}

interface BuildFileNameResult {
  fileName: string;
  /** Popunjava se kad je segment morao pasti na NEPOZNATO placeholder zbog nedostajućeg podatka. */
  warnings: string[];
}

export function buildFileName({
  oblikObjekta,
  adresa,
  oznakaObjekta,
  versionNumber,
  extension,
  generatedAt = new Date(),
}: {
  oblikObjekta: string;
  adresa: string;
  oznakaObjekta: number;
  versionNumber: number;
  extension: "csv" | "xml";
  generatedAt?: Date;
}): BuildFileNameResult {
  const warnings: string[] = [];

  let oblik = normalizeSegment(oblikObjekta);
  if (!oblik) {
    oblik = EMPTY_SEGMENT_PLACEHOLDER;
    warnings.push("Oblik objekta nedostaje ili ne sadrži nijedan alfanumerički znak — korišten NEPOZNATO.");
  }

  let adresaSegment = normalizeSegment(adresa);
  if (!adresaSegment) {
    adresaSegment = EMPTY_SEGMENT_PLACEHOLDER;
    warnings.push("Adresa objekta nedostaje ili ne sadrži nijedan alfanumerički znak — korišten NEPOZNATO.");
  }

  const oznaka = String(oznakaObjekta).padStart(3, "0");
  const pohrana = String(versionNumber).padStart(4, "0");
  const y = generatedAt.getUTCFullYear();
  const m = String(generatedAt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(generatedAt.getUTCDate()).padStart(2, "0");
  const hh = String(generatedAt.getUTCHours()).padStart(2, "0");
  const mm = String(generatedAt.getUTCMinutes()).padStart(2, "0");

  const fileName = `${oblik}_${adresaSegment}_${oznaka}_${pohrana}_${y}${m}${d}_${hh}${mm}.${extension}`;

  return { fileName, warnings };
}
