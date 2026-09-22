import "server-only";
import { MAX_EXTRACTED_ITEMS, withParseTimeout } from "@/lib/security/fileValidation";
import { extractItemsFromText, type ExtractedItem } from "./heuristics";

const MAX_TEXT_LENGTH = 2_000_000; // sigurnosna granica protiv zip-bomb / preveliki dokumenti

export async function extractItemsFromPdf(buffer: Buffer): Promise<ExtractedItem[]> {
  const pdfParse = (await import("pdf-parse")).default;
  // pdf-parse ekstrahira samo tekst, ne izvršava embedded JavaScript.
  const result = await withParseTimeout(pdfParse(buffer));
  const text = result.text.slice(0, MAX_TEXT_LENGTH);
  return extractItemsFromText(text).slice(0, MAX_EXTRACTED_ITEMS);
}

export async function extractItemsFromDocx(buffer: Buffer): Promise<ExtractedItem[]> {
  const mammoth = await import("mammoth");
  // mammoth čita samo tekstualni sadržaj iz .docx zip arhive, ne izvršava makronaredbe.
  const result = await withParseTimeout(mammoth.extractRawText({ buffer }));
  const text = result.value.slice(0, MAX_TEXT_LENGTH);
  return extractItemsFromText(text).slice(0, MAX_EXTRACTED_ITEMS);
}
