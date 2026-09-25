import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertVenueOwner } from "@/lib/ownership";
import {
  MAX_UPLOAD_BYTES,
  detectSourceType,
  generateStorageFilename,
} from "@/lib/security/fileValidation";
import { parseCsvItems, parseXlsxItems, parseXmlItems } from "@/lib/parsers/structured";
import { extractItemsFromDocx, extractItemsFromPdf } from "@/lib/parsers/documents";
import { applyDefaultTip, extractItemsFromText, type ExtractedItem } from "@/lib/parsers/heuristics";
import { extractItemsFromImageViaOcr, extractItemsFromPdfViaOcr } from "@/lib/parsers/ocr";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/apiRoute";

// OCR fallback (rasterizacija + Tesseract) može potrajati — dopusti rutu
// dulje trajanje na Vercelu nego default. Bez efekta izvan Vercela.
export const maxDuration = 60;

export const POST = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ venue: string }> }
) => {
  const { venue: venueId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });

  const venue = await assertVenueOwner(supabase, venueId, user.id);
  if (!venue) return NextResponse.json({ error: "Nije pronađeno." }, { status: 404 });

  const allowed = await checkRateLimit(supabase, "upload", RATE_LIMITS.upload);
  if (!allowed) {
    return NextResponse.json({ error: "Previše zahtjeva. Pokušajte kasnije." }, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_UPLOAD_BYTES + 1024 * 100) {
    return NextResponse.json({ error: "Datoteka je prevelika (maks. 15 MB)." }, { status: 413 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Datoteka nedostaje." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Datoteka je prevelika (maks. 15 MB)." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sourceType = await detectSourceType(buffer, file.name);

  if (!sourceType) {
    await logAudit({
      userId: user.id,
      venueId,
      action: "import_upload",
      outcome: "failure",
      details: "Nepodržan ili neprepoznat tip datoteke",
    });
    return NextResponse.json(
      {
        error:
          "Nepodržan tip datoteke. Dopušteno: PDF, DOCX, XLSX, CSV, XML ili fotografija (JPG/PNG).",
      },
      { status: 400 }
    );
  }

  // Spremi originalnu datoteku u privatni storage pod generiranim (UUID) imenom.
  const storagePath = `${venueId}/${generateStorageFilename(sourceType)}`;
  await supabase.storage.from("import-uploads").upload(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  let items: ExtractedItem[] = [];
  let usedOcr = false;

  if (sourceType === "jpg" || sourceType === "png") {
    // Fotografija nikad nema tekstualni sloj — nema smisla "prvo pokušaj
    // tekst-ekstrakciju", ide se izravno u isti OCR pipeline koji PDF
    // fallback koristi za rasterizirane stranice.
    try {
      const ocrResult = await extractItemsFromImageViaOcr(buffer);
      items = ocrResult.items;
      usedOcr = ocrResult.usedOcr;
      await logAudit({
        userId: user.id,
        venueId,
        action: "import_upload",
        outcome: usedOcr ? "success" : "warning",
        details: `OCR fotografije: ${items.length} stavki`,
      });
    } catch (err) {
      await logAudit({
        userId: user.id,
        venueId,
        action: "import_upload",
        outcome: "failure",
        details: `OCR fotografije nije uspio: ${err instanceof Error ? err.message : "nepoznata greška"}`,
      });
      return NextResponse.json({ error: "Obrada fotografije nije uspjela." }, { status: 422 });
    }
  } else {
    try {
      switch (sourceType) {
        case "csv":
          items = parseCsvItems(buffer.toString("utf-8"));
          break;
        case "xml":
          items = parseXmlItems(buffer.toString("utf-8"));
          break;
        case "xlsx":
          items = parseXlsxItems(buffer);
          break;
        case "docx":
          items = await extractItemsFromDocx(buffer);
          break;
        case "pdf":
          items = await extractItemsFromPdf(buffer);
          break;
      }
    } catch (err) {
      if (sourceType !== "pdf") {
        await logAudit({
          userId: user.id,
          venueId,
          action: "import_upload",
          outcome: "failure",
          details: `Parsiranje ${sourceType} nije uspjelo`,
        });
        return NextResponse.json({ error: "Obrada datoteke nije uspjela." }, { status: 422 });
      }
      // Standardna PDF tekst-ekstrakcija (pdf-parse) zna baciti iznimku na
      // inače ispravnom PDF-u čiji content stream njen (stariji, bundlani)
      // pdf.js ne zna parsirati (potvrđeno testom: reportlab-generirani PDF
      // -> "Command token too long"). Ne odustaj odmah — tretiraj kao "nema
      // teksta" i pusti OCR fallback ispod da pokuša: to je potpuno odvojen
      // put preko pdfjs-dist rasterizacije koji ne koristi pdf-parse, pa ista
      // greška ondje ne postoji.
      items = [];
      await logAudit({
        userId: user.id,
        venueId,
        action: "import_upload",
        outcome: "warning",
        details: `Standardna PDF ekstrakcija nije uspjela (${err instanceof Error ? err.message : "nepoznata greška"}) — pokušavam OCR fallback`,
      });
    }

    if (!items || items.length === 0) {
      // Pokušaj generičke heuristike nad tekstom kao zadnja linija obrane za CSV/plain izvore.
      items = sourceType === "csv" ? extractItemsFromText(buffer.toString("utf-8")) : [];
    }

    // OCR fallback samo za PDF: standardna ekstrakcija ne pronalazi ništa
    // najčešće kod print-ready PDF-ova s tekstom pretvorenim u krivulje —
    // nema tekstualnih objekata za pasivnu ekstrakciju, samo vektorske putanje.
    if (sourceType === "pdf" && items.length === 0) {
      try {
        const ocrResult = await extractItemsFromPdfViaOcr(buffer);
        items = ocrResult.items;
        usedOcr = ocrResult.usedOcr;
        await logAudit({
          userId: user.id,
          venueId,
          action: "import_upload",
          outcome: usedOcr ? "success" : "warning",
          details: `OCR fallback: ${ocrResult.pagesProcessed}/${ocrResult.pagesAttempted} stranica obrađeno, ${items.length} stavki`,
        });
      } catch (err) {
        await logAudit({
          userId: user.id,
          venueId,
          action: "import_upload",
          outcome: "warning",
          details: `OCR fallback nije uspio: ${err instanceof Error ? err.message : "nepoznata greška"}`,
        });
      }
    }
  }

  items = applyDefaultTip(items, venue.default_tip);

  const { data: importSource } = await supabase
    .from("import_sources")
    .insert({
      venue_id: venueId,
      source_type: sourceType,
      status: items.length > 0 ? "izvučeno — čeka pregled" : "nema prepoznatih stavki",
      method: usedOcr ? "automatska ekstrakcija (OCR)" : "automatska ekstrakcija",
      item_count: items.length,
    })
    .select()
    .single();

  await logAudit({
    userId: user.id,
    venueId,
    action: "import_upload",
    outcome: "success",
    details: `${sourceType}: ${items.length} stavki${usedOcr ? " (OCR)" : ""}`,
  });

  return NextResponse.json({ importSourceId: importSource?.id, items, usedOcr });
});
