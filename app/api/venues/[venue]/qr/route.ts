import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venue: string }> }
) {
  const { venue: venueId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "svg" ? "svg" : "png";
  const download = searchParams.get("download") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });

  const { data: venue } = await supabase
    .from("venues")
    .select("id, slug, owner_user_id")
    .eq("id", venueId)
    .maybeSingle();

  if (!venue || venue.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Nije pronađeno." }, { status: 404 });
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/c/${venue.slug}`;
  const disposition = download ? `attachment; filename="sidro-qr-${venue.slug}.${format}"` : "inline";

  if (format === "svg") {
    const svg = await QRCode.toString(publicUrl, { type: "svg", margin: 1 });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Content-Disposition": disposition },
    });
  }

  const buffer = await QRCode.toBuffer(publicUrl, { type: "png", margin: 1, width: 512 });
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png", "Content-Disposition": disposition },
  });
}
