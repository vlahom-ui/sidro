import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/DashboardHeader";
import { VenueActions } from "@/components/VenueActions";

const SOURCE_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  xlsx: "Excel",
  csv: "CSV",
  xml: "XML",
  url: "URL",
  tekst: "Tekst (copy-paste)",
};

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ venue: string }>;
}) {
  const { venue: venueId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: venue } = await supabase.from("venues").select("*").eq("id", venueId).maybeSingle();
  if (!venue) notFound();

  const { data: importSources } = await supabase
    .from("import_sources")
    .select("*")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  const { data: generatedFiles } = await supabase
    .from("generated_files")
    .select("*")
    .eq("venue_id", venueId)
    .eq("is_current", true)
    .order("generated_at", { ascending: false });

  const { count: itemCount } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId);

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${venue.slug}`;

  return (
    <main className="min-h-screen">
      <DashboardHeader email={user.email ?? ""} />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">{venue.naziv}</h1>
          <span
            className={`text-xs px-2 py-1 rounded ${
              venue.status === "published" ? "bg-navy text-navy-light" : "border border-navy/30"
            }`}
          >
            {venue.status === "published" ? "objavljeno" : "nacrt"}
          </span>
        </div>
        <p className="text-sm opacity-70 mb-1">{venue.adresa}</p>
        <p className="text-sm opacity-70 mb-6">
          Javna stranica:{" "}
          <a href={publicUrl} className="text-slate underline">
            {publicUrl}
          </a>
        </p>

        <div className="flex gap-3 mb-8">
          <Link href={`/dashboard/${venue.id}/cjenik`} className="btn-primary rounded px-4 py-2 font-bold">
            Uredi cjenik ({itemCount ?? 0} stavki)
          </Link>
          <Link href={`/dashboard/${venue.id}/audit`} className="rounded px-4 py-2 border border-navy/30 font-bold">
            Log aktivnosti
          </Link>
        </div>

        <section className="mb-10 flex flex-col sm:flex-row gap-6 items-start">
          <div className="border border-navy/20 rounded p-3 bg-white/40">
            <Image
              src={`/api/venues/${venue.id}/qr?format=png`}
              alt={`QR kod za ${publicUrl}`}
              width={160}
              height={160}
              unoptimized
            />
          </div>
          <VenueActions venueId={venue.id} status={venue.status} />
        </section>

        <section className="mb-10">
          <h2 className="font-bold mb-3">Generirane datoteke</h2>
          {generatedFiles && generatedFiles.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-navy/20">
                  <th className="py-2 pr-4">Format</th>
                  <th className="py-2 pr-4">Tip</th>
                  <th className="py-2 pr-4">Verzija</th>
                  <th className="py-2 pr-4">Generirano</th>
                  <th className="py-2 pr-4">Vrijedi do</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {generatedFiles.map((f) => (
                  <tr key={f.id} className="border-b border-navy/10">
                    <td className="py-2 pr-4 uppercase">{f.format}</td>
                    <td className="py-2 pr-4">{f.tip}</td>
                    <td className="py-2 pr-4">v{f.version_number}</td>
                    <td className="py-2 pr-4">{new Date(f.generated_at).toLocaleString("hr-HR")}</td>
                    <td className="py-2 pr-4">{new Date(f.expires_at).toLocaleDateString("hr-HR")}</td>
                    <td className="py-2">
                      <a href={f.file_url} className="text-slate underline">
                        Preuzmi
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm opacity-70">Cjenik još nije generiran.</p>
          )}
        </section>

        <section>
          <h2 className="font-bold mb-3">Izvori uvoza</h2>
          {importSources && importSources.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-navy/20">
                  <th className="py-2 pr-4">Izvor</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Metoda</th>
                  <th className="py-2 pr-4">Broj stavki</th>
                  <th className="py-2">Datum</th>
                </tr>
              </thead>
              <tbody>
                {importSources.map((s) => (
                  <tr key={s.id} className="border-b border-navy/10">
                    <td className="py-2 pr-4">{SOURCE_LABELS[s.source_type] ?? s.source_type}</td>
                    <td className="py-2 pr-4">{s.status}</td>
                    <td className="py-2 pr-4">{s.method}</td>
                    <td className="py-2 pr-4">{s.item_count}</td>
                    <td className="py-2">{new Date(s.created_at).toLocaleString("hr-HR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm opacity-70">Još nema evidentiranih uvoza.</p>
          )}
        </section>
      </div>
    </main>
  );
}
