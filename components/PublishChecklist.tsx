import Link from "next/link";

export interface PublishStep {
  label: string;
  done: boolean;
  /** Cilj klika kad korak nije gotov — put unutar aplikacije ili "#id" za skrol na akciju na istoj stranici. */
  href?: string;
}

export function PublishChecklist({ steps }: { steps: PublishStep[] }) {
  const allDone = steps.every((s) => s.done);

  if (allDone) {
    // Iskusan korisnik koji se vraća na već objavljen objekt ne treba puni
    // checklist pred sobom — sklopljeno u jednu liniju dok stanje ostaje
    // potpuno (server komponenta, pa se ovo samo od sebe ponovno raspetlja
    // čim neki korak prestane biti ispunjen, npr. cjenik postane zastarjel).
    return (
      <div className="mb-6 border border-navy/10 rounded px-4 py-2 text-sm font-bold">Sve objavljeno ✓</div>
    );
  }

  return (
    <div className="mb-6 border border-navy/10 rounded px-4 py-3 flex flex-col gap-1.5">
      <p className="text-xs uppercase opacity-60 font-bold mb-1">Koraci do objave</p>
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-2 text-sm">
          <span aria-hidden="true">{step.done ? "☑" : "☐"}</span>
          {step.done || !step.href ? (
            <span className={step.done ? "opacity-70" : ""}>{step.label}</span>
          ) : step.href.startsWith("#") ? (
            <a href={step.href} className="text-slate underline">
              {step.label}
            </a>
          ) : (
            <Link href={step.href} className="text-slate underline">
              {step.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
