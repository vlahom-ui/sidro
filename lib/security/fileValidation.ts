import "server-only";
import { fileTypeFromBuffer } from "file-type";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_EXTRACTED_ITEMS = 2000;
export const PARSE_TIMEOUT_MS = 15000;

export type AllowedSourceType = "pdf" | "docx" | "xlsx" | "csv" | "xml";

interface TypeCheck {
  sourceType: AllowedSourceType;
  mimeMatches: string[];
  extMatches: string[];
}

const ALLOWED_TYPES: TypeCheck[] = [
  { sourceType: "pdf", mimeMatches: ["application/pdf"], extMatches: ["pdf"] },
  {
    sourceType: "docx",
    mimeMatches: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    extMatches: ["docx"],
  },
  {
    sourceType: "xlsx",
    mimeMatches: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip", // xlsx detektira se kao zip ako nema dovoljno signatura
    ],
    extMatches: ["xlsx"],
  },
];

/**
 * Provjerava pravi tip datoteke preko magic bytes (file-type paket), nikad
 * preko ekstenzije ili Content-Type headera koji šalje klijent. CSV i plain
 * text nemaju pouzdan magic-byte potpis pa se za njih provjerava da sadržaj
 * ne sadrži binarne (null) bajtove.
 */
export async function detectSourceType(
  buffer: Buffer,
  declaredName: string
): Promise<AllowedSourceType | null> {
  const detected = await fileTypeFromBuffer(buffer);
  const lowerName = declaredName.toLowerCase();

  if (detected) {
    for (const t of ALLOWED_TYPES) {
      if (t.mimeMatches.includes(detected.mime)) {
        // application/zip se dijeli sa docx/xlsx — razlikuj po ekstenziji imena.
        if (detected.mime === "application/zip") {
          if (lowerName.endsWith(".xlsx")) return "xlsx";
          if (lowerName.endsWith(".docx")) return "docx";
          continue;
        }
        return t.sourceType;
      }
    }
    return null;
  }

  // Nema prepoznatog binarnog potpisa — dopusti samo CSV/XML/plain text
  // ako sadržaj ne izgleda binarno (bez null bajtova) i ekstenzija odgovara.
  const looksBinary = buffer.subarray(0, 8000).includes(0);
  if (looksBinary) return null;

  if (lowerName.endsWith(".xml")) return "xml";
  if (lowerName.endsWith(".csv") || lowerName.endsWith(".txt")) return "csv";

  return null;
}

export function generateStorageFilename(sourceType: string): string {
  return `${crypto.randomUUID()}.${sourceType}`;
}

export async function withParseTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Obrada datoteke je predugo trajala.")), PARSE_TIMEOUT_MS)
    ),
  ]);
}
