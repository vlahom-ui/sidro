"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useConfirm } from "@/components/useConfirm";

interface CjenikWithCount {
  id: string;
  naziv: string;
  slug: string;
  itemCount: number;
  kategorijaLabel: string | null;
}

export function CjeniciList({
  venueId,
  cjenici,
  publicUrl,
}: {
  venueId: string;
  cjenici: CjenikWithCount[];
  publicUrl: string;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  async function handleDelete(cjenik: CjenikWithCount) {
    if (cjenik.itemCount > 0) {
      const confirmed = await confirm(
        `Obrisati "${cjenik.naziv}" i svih ${cjenik.itemCount} stavki unutra? Ova radnja se ne može poništiti.`,
        { confirmLabel: "Obriši cjenik" }
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
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`${publicUrl}/${c.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-slate underline text-sm"
            >
              Pregled
            </a>
            <button
              onClick={() => handleDelete(c)}
              disabled={deletingId === c.id}
              className="text-alert underline text-sm disabled:opacity-50"
            >
              {deletingId === c.id ? "Brisanje..." : "Obriši"}
            </button>
          </div>
        </div>
      ))}
      {error && <p className="text-alert text-sm">{error}</p>}
      {ConfirmDialog}
    </div>
  );
}
