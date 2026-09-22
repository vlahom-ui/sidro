import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 py-6 flex items-center justify-between max-w-4xl mx-auto w-full">
        <span className="text-2xl lowercase font-bold text-navy">sidro</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/login" className="text-slate underline">
            Prijava
          </Link>
          <Link href="/register" className="btn-primary rounded px-4 py-2 font-bold">
            Registracija
          </Link>
        </nav>
      </header>

      <section className="flex-1 flex items-center">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-3xl sm:text-4xl font-bold max-w-2xl mb-6">
            Sidrena cijena i strojno čitljiv cjenik — u nekoliko minuta.
          </h1>
          <p className="max-w-xl text-lg mb-8">
            Od 1.10.2026. svaki trgovac i pružatelj usluga u B2C poslovanju u Hrvatskoj mora
            isticati sidrenu cijenu i objaviti strojno čitljiv cjenik (.csv/.xml). Sidro generira
            ispravno formatirane datoteke iz vašeg postojećeg cjenika i hosta javnu stranicu s
            trajnim QR kodom.
          </p>
          <Link href="/register" className="btn-primary rounded px-6 py-3 font-bold inline-block">
            Započnite besplatno
          </Link>
        </div>
      </section>

      <footer className="px-4 py-6 text-sm text-center opacity-70">
        <Link href="/terms" className="underline">
          Uvjeti korištenja
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="underline">
          Politika privatnosti
        </Link>
      </footer>
    </main>
  );
}
