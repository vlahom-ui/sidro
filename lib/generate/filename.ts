const OBLIK_CODES: Record<string, string> = {
  restoran: "RES",
  kafić: "KAF",
  trgovina: "TRG",
  "frizerski salon": "FRI",
  "kozmetički salon": "KOZ",
  obrt: "OBR",
};

function stripDiacritics(input: string): string {
  return input.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function oblikCode(oblikObjekta: string): string {
  const key = oblikObjekta.trim().toLowerCase();
  if (OBLIK_CODES[key]) return OBLIK_CODES[key];
  return stripDiacritics(key).replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "OBJ";
}

function addressCode(adresa: string): string {
  return stripDiacritics(adresa)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
}

/**
 * Naziv datoteke prati redoslijed: oblik objekta, adresa, oznaka objekta,
 * broj pohrane (verzija), vremenska oznaka.
 * npr. TRG_ZAGREBACKA10_001_0001_20261001_0755.csv
 */
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
}): string {
  const oznaka = String(oznakaObjekta).padStart(3, "0");
  const pohrana = String(versionNumber).padStart(4, "0");
  const y = generatedAt.getUTCFullYear();
  const m = String(generatedAt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(generatedAt.getUTCDate()).padStart(2, "0");
  const hh = String(generatedAt.getUTCHours()).padStart(2, "0");
  const mm = String(generatedAt.getUTCMinutes()).padStart(2, "0");
  const timestamp = `${y}${m}${d}_${hh}${mm}`;

  return `${oblikCode(oblikObjekta)}_${addressCode(adresa)}_${oznaka}_${pohrana}_${timestamp}.${extension}`;
}
