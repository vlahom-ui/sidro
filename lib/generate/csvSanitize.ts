const DANGEROUS_PREFIX_RE = /^[=+\-@]/;

/** Kod generiranja izlaznog CSV-a: ako polje počinje =,+,-,@ prefiksaj apostrofom da spriječiš CSV injection u Excelu/Sheetsu. */
export function sanitizeCsvField(value: string): string {
  if (DANGEROUS_PREFIX_RE.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function csvEscape(value: string): string {
  const safe = sanitizeCsvField(value);
  if (/[",\n;]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
