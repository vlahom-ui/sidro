import "server-only";
import type { Database } from "@/lib/database.types";
import { csvEscape } from "./csvSanitize";

type Item = Database["public"]["Tables"]["items"]["Row"];

const DA_NE = (v: boolean) => (v ? "DA" : "NE");
const fmt = (n: number | null) => (n === null ? "" : n.toFixed(2));

export function buildUslugeCsv(items: Item[]): string {
  const header = [
    "Naziv usluge",
    "Maloprodajna cijena",
    "Poseban oblik prodaje (DA/NE)",
    "Naziv posebnog oblika prodaje",
    "Cijena 10.9.2026.",
  ];
  const rows = items.map((i) =>
    [
      i.naziv,
      fmt(i.cijena),
      DA_NE(i.poseban_oblik_prodaje),
      i.naziv_posebnog_oblika ?? "",
      fmt(i.sidrena_cijena),
    ]
      .map((v) => csvEscape(String(v)))
      .join(";")
  );
  return [header.join(";"), ...rows].join("\r\n");
}

export function buildProizvodiCsv(items: Item[]): string {
  const header = [
    "Naziv proizvoda",
    "Šifra",
    "Marka",
    "Jedinica mjere",
    "Cijena za jedinicu mjere",
    "Maloprodajna cijena",
    "Poseban oblik prodaje (DA/NE)",
    "Naziv posebnog oblika prodaje",
    "Cijena 10.9.2026.",
    "Barkod",
    "Dostupnost",
  ];
  const rows = items.map((i) =>
    [
      i.naziv,
      i.sifra ?? "",
      i.marka ?? "",
      i.jedinica_mjere ?? "",
      fmt(i.cijena_po_jedinici),
      fmt(i.cijena),
      DA_NE(i.poseban_oblik_prodaje),
      i.naziv_posebnog_oblika ?? "",
      fmt(i.sidrena_cijena),
      i.barkod ?? "",
      i.dostupnost === "dostupno" ? "Dostupno" : i.dostupnost === "nedostupno" ? "Nedostupno" : "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(";")
  );
  return [header.join(";"), ...rows].join("\r\n");
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildUslugeXml(items: Item[]): string {
  const stavke = items
    .map(
      (i) => `  <usluga>
    <naziv_usluge>${xmlEscape(i.naziv)}</naziv_usluge>
    <maloprodajna_cijena>${fmt(i.cijena)}</maloprodajna_cijena>
    <poseban_oblik_prodaje>${DA_NE(i.poseban_oblik_prodaje)}</poseban_oblik_prodaje>
    <naziv_posebnog_oblika_prodaje>${xmlEscape(i.naziv_posebnog_oblika ?? "")}</naziv_posebnog_oblika_prodaje>
    <cijena_10_9_2026>${fmt(i.sidrena_cijena)}</cijena_10_9_2026>
  </usluga>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<cjenik_usluga>\n${stavke}\n</cjenik_usluga>\n`;
}

export function buildProizvodiXml(items: Item[]): string {
  const stavke = items
    .map(
      (i) => `  <proizvod>
    <naziv_proizvoda>${xmlEscape(i.naziv)}</naziv_proizvoda>
    <sifra>${xmlEscape(i.sifra ?? "")}</sifra>
    <marka>${xmlEscape(i.marka ?? "")}</marka>
    <jedinica_mjere>${xmlEscape(i.jedinica_mjere ?? "")}</jedinica_mjere>
    <cijena_za_jedinicu_mjere>${fmt(i.cijena_po_jedinici)}</cijena_za_jedinicu_mjere>
    <maloprodajna_cijena>${fmt(i.cijena)}</maloprodajna_cijena>
    <poseban_oblik_prodaje>${DA_NE(i.poseban_oblik_prodaje)}</poseban_oblik_prodaje>
    <naziv_posebnog_oblika_prodaje>${xmlEscape(i.naziv_posebnog_oblika ?? "")}</naziv_posebnog_oblika_prodaje>
    <cijena_10_9_2026>${fmt(i.sidrena_cijena)}</cijena_10_9_2026>
    <barkod>${xmlEscape(i.barkod ?? "")}</barkod>
    <dostupnost>${i.dostupnost === "dostupno" ? "Dostupno" : i.dostupnost === "nedostupno" ? "Nedostupno" : ""}</dostupnost>
  </proizvod>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<cjenik_proizvoda>\n${stavke}\n</cjenik_proizvoda>\n`;
}
