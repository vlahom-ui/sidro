import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { NewVenueForm } from "@/components/NewVenueForm";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen">
      <DashboardHeader email={user.email ?? ""} />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumb items={[{ label: "Objekti" }]} />
        <h1 className="text-xl font-bold mb-6">Vaši objekti</h1>

        {venues && venues.length > 0 && (
          <ul className="flex flex-col gap-3 mb-8">
            {venues.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/dashboard/${v.id}`}
                  className="block border border-navy/20 rounded px-4 py-3 hover:bg-navy-light"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{v.naziv}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        v.status === "published" ? "bg-navy text-navy-light" : "border border-navy/30"
                      }`}
                    >
                      {v.status === "published" ? "objavljeno" : "Neobjavljeno"}
                    </span>
                  </div>
                  <span className="text-sm opacity-70">{v.adresa}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {(!venues || venues.length === 0) && (
          <p className="text-sm opacity-70 mb-6">Još nemate niti jedan objekt. Dodajte prvi ispod.</p>
        )}

        <NewVenueForm />
      </div>
    </main>
  );
}
