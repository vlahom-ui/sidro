import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertVenueOwner } from "@/lib/ownership";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";
import { buildFileName, GENERATED_FILENAME_RE } from "@/lib/generate/filename";
import {
  buildProizvodiCsv,
  buildProizvodiXml,
  buildUslugeCsv,
  buildUslugeXml,
} from "@/lib/generate/files";
import type { Database, GeneratedFileFormat, ItemTip } from "@/lib/database.types";
import { withErrorHandling } from "@/lib/apiRoute";

type Item = Database["public"]["Tables"]["items"]["Row"];

const EXPIRY_DAYS = 30;

export const POST = withErrorHandling(async (
  _request: Request,
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

  const allowed = await checkRateLimit(supabase, "generate", RATE_LIMITS.generate);
  if (!allowed) {
    return NextResponse.json({ error: "Previše zahtjeva. Pokušajte kasnije." }, { status: 429 });
  }

  const { data: items } = await supabase.from("items").select("*").eq("venue_id", venueId);
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cjenik nema stavki za generiranje." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: ownerVenues } = await admin
    .from("venues")
    .select("id, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });
  const oznakaObjekta = (ownerVenues ?? []).findIndex((v) => v.id === venueId) + 1 || 1;

  const proizvodi = items.filter((i) => i.tip === "proizvod");
  const usluge = items.filter((i) => i.tip === "usluga");

  const groups: { tip: ItemTip; rows: Item[] }[] = [
    ...(proizvodi.length > 0 ? [{ tip: "proizvod" as ItemTip, rows: proizvodi }] : []),
    ...(usluge.length > 0 ? [{ tip: "usluga" as ItemTip, rows: usluge }] : []),
  ];

  const generatedAt = new Date();
  const expiresAt = new Date(generatedAt.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const results: { tip: ItemTip; format: GeneratedFileFormat; fileUrl: string; versionNumber: number }[] = [];
  const filenameWarnings = new Set<string>();

  for (const group of groups) {
    for (const format of ["csv", "xml"] as GeneratedFileFormat[]) {
      const content =
        format === "csv"
          ? group.tip === "proizvod"
            ? buildProizvodiCsv(group.rows)
            : buildUslugeCsv(group.rows)
          : group.tip === "proizvod"
            ? buildProizvodiXml(group.rows)
            : buildUslugeXml(group.rows);

      const { data: previous } = await admin
        .from("generated_files")
        .select("version_number")
        .eq("venue_id", venueId)
        .eq("tip", group.tip)
        .eq("format", format)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const versionNumber = (previous?.version_number ?? 0) + 1;
      const { fileName, warnings } = buildFileName({
        oblikObjekta: venue.oblik_objekta,
        adresa: venue.adresa,
        oznakaObjekta,
        versionNumber,
        extension: format,
        generatedAt,
      });
      warnings.forEach((w) => filenameWarnings.add(w));
      if (!GENERATED_FILENAME_RE.test(fileName)) {
        // Ne bi se smjelo dogoditi s obzirom na normalizaciju u buildFileName — sigurnosna mreža.
        throw new Error(`Generirani naziv datoteke ne prolazi validaciju: ${fileName}`);
      }
      const storagePath = `${venueId}/${fileName}`;

      const contentType = format === "csv" ? "text/csv; charset=utf-8" : "application/xml; charset=utf-8";
      // BOM za CSV radi ispravnog prikaza hrvatskih dijakritika u Excelu.
      const body = format === "csv" ? "﻿" + content : content;

      await admin.storage.from("generated-files").upload(storagePath, body, {
        contentType,
        upsert: true,
      });

      const { data: publicUrlData } = admin.storage.from("generated-files").getPublicUrl(storagePath);

      // Stare verzije se NE brišu prije expires_at, samo se označe kao ne-trenutne.
      await admin
        .from("generated_files")
        .update({ is_current: false })
        .eq("venue_id", venueId)
        .eq("tip", group.tip)
        .eq("format", format)
        .eq("is_current", true);

      await admin.from("generated_files").insert({
        venue_id: venueId,
        format,
        tip: group.tip,
        file_url: publicUrlData.publicUrl,
        version_number: versionNumber,
        generated_at: generatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_current: true,
      });

      results.push({ tip: group.tip, format, fileUrl: publicUrlData.publicUrl, versionNumber });
    }
  }

  await logAudit({
    userId: user.id,
    venueId,
    action: "generate_files",
    outcome: "success",
    details: `${results.length} datoteka generirano`,
  });

  if (filenameWarnings.size > 0) {
    await logAudit({
      userId: user.id,
      venueId,
      action: "generate_files",
      outcome: "warning",
      details: `Nedostajući podaci za naziv datoteke: ${Array.from(filenameWarnings).join(" ")}`,
    });
  }

  return NextResponse.json({ files: results, filenameWarnings: Array.from(filenameWarnings) });
});
