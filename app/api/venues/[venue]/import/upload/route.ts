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
import { extractItemsFromText } from "@/lib/parsers/heuristics";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venue: string }> }
) {
  const { venue: venueId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });

  const venue = await assertVenueOwner(supabase, venueId, user.id);
  if (!venue) return NextResponse.json({ error: "Nije pronađeno." }, { status: 404 });

  const allowed = await checkRateLimit(user.id, "upload", RATE_LIMITS.upload);
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
      { error: "Nepodržan tip datoteke. Dopušteno: PDF, DOCX, XLSX, CSV, XML." },
      { status: 400 }
    );
  }

  // Spremi originalnu datoteku u privatni storage pod generiranim (UUID) imenom.
  const storagePath = `${venueId}/${generateStorageFilename(sourceType)}`;
  await supabase.storage.from("import-uploads").upload(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  let items;
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
  } catch {
    await logAudit({
      userId: user.id,
      venueId,
      action: "import_upload",
      outcome: "failure",
      details: `Parsiranje ${sourceType} nije uspjelo`,
    });
    return NextResponse.json({ error: "Obrada datoteke nije uspjela." }, { status: 422 });
  }

  if (!items || items.length === 0) {
    // Pokušaj generičke heuristike nad tekstom kao zadnja linija obrane za CSV/plain izvore.
    items = sourceType === "csv" ? extractItemsFromText(buffer.toString("utf-8")) : [];
  }

  const { data: importSource } = await supabase
    .from("import_sources")
    .insert({
      venue_id: venueId,
      source_type: sourceType,
      status: items.length > 0 ? "izvučeno — čeka pregled" : "nema prepoznatih stavki",
      method: "automatska ekstrakcija",
      item_count: items.length,
    })
    .select()
    .single();

  await logAudit({
    userId: user.id,
    venueId,
    action: "import_upload",
    outcome: "success",
    details: `${sourceType}: ${items.length} stavki`,
  });

  return NextResponse.json({ importSourceId: importSource?.id, items });
}
