"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface CjenikWithCount {
  id: string;
  naziv: string;
  itemCount: number;
  kategorijaLabel: string | null;
}

export function CjeniciList({ venueId, cjenici }: { venueId: string; cjenici: CjenikWithCount[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(cjenik: CjenikWithCount) {
    if (cjenik.itemCount > 0) {
      const confirmed = confirm(
        `Obrisati "${cjenik.naziv}" i svih ${cjenik.itemCount} stavki unutra? Ova radnja se ne može poništiti.`
      );
      if (!confirmed) return;
    }

    setError(null);
    setDeletingId(cjenik.id);
    try {
      const { ok, error: apiError } = await apiFetch(`/api/cjenici/${cjenik.id}`, { method: "DELETE" });
      if (!ok) {
        setError(apiError ?? "Brisanje nije uspjelo.");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (cjenici.length === 0) {
    return <p className="text-sm opacity-70">Objekt još nema kreiran nijedan cjenik.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {cjenici.map((c) => (
        <div key={c.id} className="flex items-center justify-between border border-navy/10 rounded px-4 py-3">
          <Link href={`/dashboard/${venueId}/cjenik?cjenik=${c.id}`} className="flex-1">
            <div>
              <span className="font-bold">{c.naziv}</span>
              <span className="text-sm opacity-70 ml-2">({c.itemCount} stavki)</span>
            </div>
            {c.kategorijaLabel && <div className="text-xs opacity-60">{c.kategorijaLabel}</div>}
          </Link>
          <button
            onClick={() => handleDelete(c)}
            disabled={deletingId === c.id}
            className="text-alert underline text-sm disabled:opacity-50"
          >
            {deletingId === c.id ? "Brisanje..." : "Obriši"}
          </button>
        </div>
      ))}
      {error && <p className="text-alert text-sm">{error}</p>}
    </div>
  );
}
