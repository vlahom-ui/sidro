import { z } from "zod";

export const itemInputSchema = z
  .object({
    tip: z.enum(["proizvod", "usluga"]),
    naziv: z.string().min(1).max(300),
    cijena: z.coerce.number().nonnegative(),
    sidrenaCijena: z.coerce.number().nonnegative().nullable().optional(),
    urlSlike: z.string().url().max(1000).nullable().optional().or(z.literal("")),
    kategorija: z.string().max(200).nullable().optional(),
    posebanOblikProdaje: z.boolean().optional(),
    nazivPosebnogOblika: z.string().max(300).nullable().optional(),
    // samo za tip=proizvod
    sifra: z.string().max(100).nullable().optional(),
    marka: z.string().max(200).nullable().optional(),
    jedinicaMjere: z.string().max(50).nullable().optional(),
    cijenaPoJedinici: z.coerce.number().nonnegative().nullable().optional(),
    barkod: z.string().max(100).nullable().optional(),
    dostupnost: z.enum(["dostupno", "nedostupno"]).nullable().optional(),
  })
  .transform((data) => ({
    ...data,
    urlSlike: data.urlSlike || null,
    // Proizvod-specifična polja se ignoriraju za usluge.
    sifra: data.tip === "proizvod" ? data.sifra ?? null : null,
    marka: data.tip === "proizvod" ? data.marka ?? null : null,
    jedinicaMjere: data.tip === "proizvod" ? data.jedinicaMjere ?? null : null,
    cijenaPoJedinici: data.tip === "proizvod" ? data.cijenaPoJedinici ?? null : null,
    barkod: data.tip === "proizvod" ? data.barkod ?? null : null,
    dostupnost: data.tip === "proizvod" ? data.dostupnost ?? null : null,
  }));

export type ItemInput = z.infer<typeof itemInputSchema>;
