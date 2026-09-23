import "server-only";
import path from "node:path";
import { extractItemsFromText, type ExtractedItem } from "./heuristics";
import { MAX_EXTRACTED_ITEMS } from "@/lib/security/fileValidation";

// Sigurnosni/resursni limiti (nadovezuje se na postojeći security brief za upload):
const MAX_OCR_PAGES = 20;
const MAX_RASTER_DIMENSION = 2000; // px — dovoljno za OCR, ne treba veća rezolucija
const PER_PAGE_TIMEOUT_MS = 15_000;
const TOTAL_OCR_TIMEOUT_MS = 45_000;
const OCR_LANGS = "hrv+eng";

// Jezični podaci su bundlani lokalno (lib/ocr-data/*.traineddata.gz) i
// WASM tesseract jezgra dolazi iz node_modules/tesseract.js-core — OCR
// radi potpuno offline, bez mrežnog pristupa prema van u runtimeu.
const LANG_DATA_PATH = path.join(process.cwd(), "lib", "ocr-data");

export interface OcrFallbackResult {
  items: ExtractedItem[];
  pagesProcessed: number;
  pagesAttempted: number;
  usedOcr: boolean;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} — timeout nakon ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * OCR fallback za PDF-ove kod kojih standardna tekst-ekstrakcija ne nađe
 * nijednu stavku — najčešći uzrok su print-ready PDF-ovi s tekstom
 * pretvorenim u krivulje/outline (standardna praksa u grafičkoj pripremi),
 * gdje ne postoje tekstualni objekti za pasivnu ekstrakciju.
 *
 * Rasterizira do MAX_OCR_PAGES stranica (ograničena rezolucija), pokreće
 * OCR nad svakom uz per-page i ukupni timeout, i provlači prepoznati tekst
 * kroz isti heuristički parser koji koristi "Zalijepi tekst" uvoz.
 */
export async function extractItemsFromPdfViaOcr(buffer: Buffer): Promise<OcrFallbackResult> {
  const startedAt = Date.now();

  const [pdfjsLib, canvasModule, tesseractModule] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("@napi-rs/canvas"),
    import("tesseract.js"),
  ]);
  const { createCanvas } = canvasModule;
  const { createWorker } = tesseractModule;

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: false,
  });
  const doc = await loadingTask.promise;

  const pagesAttempted = Math.min(doc.numPages, MAX_OCR_PAGES);

  const worker = await createWorker(OCR_LANGS, 1, {
    langPath: LANG_DATA_PATH,
    gzip: true,
    cacheMethod: "none",
  });

  let combinedText = "";
  let pagesProcessed = 0;

  try {
    for (let pageNum = 1; pageNum <= pagesAttempted; pageNum++) {
      if (Date.now() - startedAt > TOTAL_OCR_TIMEOUT_MS) break;

      try {
        const text = await withTimeout(
          ocrSinglePage(doc, pageNum, createCanvas, worker),
          PER_PAGE_TIMEOUT_MS,
          `OCR stranice ${pageNum}`
        );
        combinedText += `\n${text}`;
        pagesProcessed++;
      } catch {
        // Preskoči stranicu na kojoj OCR ne uspije ili istekne i nastavi dalje —
        // djelomični rezultat je bolji od potpunog neuspjeha cijelog uvoza.
      }
    }
  } finally {
    await worker.terminate();
    await loadingTask.destroy();
  }

  const items = extractItemsFromText(combinedText).slice(0, MAX_EXTRACTED_ITEMS);
  return { items, pagesProcessed, pagesAttempted, usedOcr: items.length > 0 };
}

async function ocrSinglePage(
  doc: Awaited<ReturnType<typeof import("pdfjs-dist/legacy/build/pdf.mjs").getDocument>["promise"]>,
  pageNum: number,
  createCanvas: (typeof import("@napi-rs/canvas"))["createCanvas"],
  worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>
): Promise<string> {
  const page = await doc.getPage(pageNum);
  const baseViewport = page.getViewport({ scale: 1 });
  const largestDimension = Math.max(baseViewport.width, baseViewport.height);
  const scale = Math.min(2, MAX_RASTER_DIMENSION / largestDimension);
  const viewport = page.getViewport({ scale: Math.max(scale, 0.5) });

  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  // @ts-expect-error — pdfjs-dist Node render() prihvaća @napi-rs/canvas context, tipovi za browser CanvasRenderingContext2D se ne poklapaju potpuno
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const pngBuffer = await canvas.encode("png");

  const { data } = await worker.recognize(pngBuffer);
  return data.text;
}
