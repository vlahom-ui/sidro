import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/DashboardHeader";

const ACTION_LABELS: Record<string, string> = {
  venue_create: "Objekt stvoren",
  venue_publish: "Cjenik objavljen",
  venue_unpublish: "Objava povučena",
  import_upload: "Uvoz datoteke",
  import_url: "Uvoz s URL-a",
  import_text: "Uvoz teksta",
  generate_files: "Generiranje cjenika",
  item_bulk_update: "Masovna izmjena stavki",
  register: "Registracija",
  email_confirm: "Potvrda emaila",
};

export default async function VenueAuditPage({
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

  const { data: venue } = await supabase.from("venues").select("id, naziv").eq("id", venueId).maybeSingle();
  if (!venue) notFound();

  const { data: entries } = await supabase
    .from("audit_log")
    .select("*")
    .eq("venue_id", venueId)
    .order("timestamp", { ascending: false })
    .limit(200);

  return (
    <main className="min-h-screen">
      <DashboardHeader email={user.email ?? ""} />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold mb-6">Log aktivnosti — {venue.naziv}</h1>

        {entries && entries.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-navy/20">
                <th className="py-2 pr-4">Vrijeme</th>
                <th className="py-2 pr-4">Akcija</th>
                <th className="py-2 pr-4">Ishod</th>
                <th className="py-2">Detalji</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-navy/10">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleString("hr-HR")}
                  </td>
                  <td className="py-2 pr-4">{ACTION_LABELS[e.action] ?? e.action}</td>
                  <td className="py-2 pr-4">
                    <span className={e.outcome === "success" ? "" : "text-alert"}>
                      {e.outcome === "success" ? "uspjeh" : e.outcome === "warning" ? "upozorenje" : "neuspjeh"}
                    </span>
                  </td>
                  <td className="py-2 opacity-70">{e.details ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm opacity-70">Još nema zabilježenih aktivnosti.</p>
        )}
      </div>
    </main>
  );
}
