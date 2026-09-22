import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-slate underline mb-8 inline-block">
          ← Natrag na sidro
        </Link>
        <h1 className="text-2xl font-bold mb-6">Uvjeti korištenja</h1>
        <p className="text-sm opacity-70">
          Konačan pravni tekst Uvjeta korištenja bit će objavljen ovdje prije javnog pokretanja
          usluge. Ova stranica je privremeni placeholder.
        </p>
      </div>
    </main>
  );
}
