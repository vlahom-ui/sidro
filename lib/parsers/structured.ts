import Papa from "papaparse";
import { XMLParser } from "fast-xml-parser";
import * as XLSX from "xlsx";
import type { ExtractedItem } from "./heuristics";

const NAME_KEYS = ["naziv", "naziv proizvoda", "naziv usluge", "name", "stavka", "artikl"];
const PRICE_KEYS = ["cijena", "maloprodajna cijena", "price", "cijena eur", "cijena (eur)"];
const ANCHOR_KEYS = ["sidrena cijena", "cijena 10.9.2026", "cijena 10.9.2026.", "anchor price"];
const TIP_KEYS = ["tip", "vrsta", "kategorija tipa"];
const UNIT_KEYS = ["jedinica mjere", "jedinica", "unit"];

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function findValue(row: Record<string, unknown>, candidates: string[]): string | undefined {
  const normalizedRow: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    normalizedRow[normalizeKey(k)] = v;
  }
  for (const c of candidates) {
    if (normalizedRow[c] !== undefined && normalizedRow[c] !== null && normalizedRow[c] !== "") {
      return String(normalizedRow[c]);
    }
  }
  return undefined;
}

function rowToItem(row: Record<string, unknown>): ExtractedItem | null {
  const naziv = findValue(row, NAME_KEYS);
  const cijenaRaw = findValue(row, PRICE_KEYS);
  if (!naziv || !cijenaRaw) return null;

  const cijena = Number(String(cijenaRaw).replace(",", "."));
  if (!Number.isFinite(cijena) || cijena <= 0) return null;

  const tipRaw = findValue(row, TIP_KEYS)?.toLowerCase();
  const unit = findValue(row, UNIT_KEYS);
  const tipExplicit = tipRaw === "usluga" || tipRaw === "proizvod";
  const tip: ExtractedItem["tip"] = tipExplicit
    ? (tipRaw as ExtractedItem["tip"])
    : unit
      ? "proizvod"
      : "usluga";

  return { tip, naziv: naziv.slice(0, 300), cijena, tipExplicit };
}

/** Sigurno parsanje CSV-a. Ćelije koje počinju s = + - @ tretiraju se kao plain text. */
export function parseCsvItems(content: string): ExtractedItem[] {
  const result = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => {
      const v = value.trim();
      if (/^[=+\-@]/.test(v)) return `'${v}`;
      return v;
    },
  });

  return result.data.map(rowToItem).filter((i): i is ExtractedItem => i !== null);
}

/** Parsanje XLSX-a (SheetJS) — samo čitanje vrijednosti, bez makronaredbi. */
export function parseXlsxItems(buffer: Buffer): ExtractedItem[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellFormula: false, bookVBA: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map(rowToItem).filter((i): i is ExtractedItem => i !== null);
}

/** Sigurno XML parsanje — vanjski entiteti su onemogućeni po defaultu (fast-xml-parser ih ne podržava). */
export function parseXmlItems(content: string): ExtractedItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
  });
  const parsed = parser.parse(content);

  const rows: Record<string, unknown>[] = [];
  function walk(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const hasNameLike = Object.keys(obj).some((k) => NAME_KEYS.includes(normalizeKey(k)));
      const hasPriceLike = Object.keys(obj).some((k) => PRICE_KEYS.includes(normalizeKey(k)));
      if (hasNameLike && hasPriceLike) {
        rows.push(obj);
      } else {
        Object.values(obj).forEach(walk);
      }
    }
  }
  walk(parsed);

  return rows.map(rowToItem).filter((i): i is ExtractedItem => i !== null);
}

export { ANCHOR_KEYS };
