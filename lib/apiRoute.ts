import { NextResponse } from "next/server";

/**
 * Omata Next.js route handler tako da svaka neuhvaćena iznimka (npr.
 * "supabaseKey is required" zbog nedostajuće env varijable, ili bilo koja
 * druga runtime greška) rezultira strukturiranim JSON error odgovorom
 * umjesto golog 500-a bez tijela koji na klijentu ruši `res.json()` prije
 * provjere `res.ok` i zamrzava formu.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("Neuhvaćena greška u API ruti:", err);
      return NextResponse.json(
        { error: "Došlo je do greške na poslužitelju. Pokušajte ponovno." },
        { status: 500 }
      );
    }
  };
}
