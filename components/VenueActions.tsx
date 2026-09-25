"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VenueStatus } from "@/lib/database.types";
import { apiFetch } from "@/lib/apiFetch";

export function VenueActions({
  venueId,
  status,
  venueNaziv,
  cjenikCount,
  itemCount,
}: {
  venueId: string;
  status: VenueStatus;
  venueNaziv: string;
  cjenikCount: number;
  itemCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"publish" | "generate" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePublishToggle() {
    setError(null);
    setLoading("publish");
    try {
      const { ok, error: apiError } = await apiFetch(`/api/venues/${venueId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "published" ? "draft" : "published" }),
      });
      if (!ok) {
        setError(apiError ?? "Greška.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerate() {
    setError(null);
    setLoading("generate");
    try {
      const { ok, error: apiError } = await apiFetch(`/api/venues/${venueId}/generate`, { method: "POST" });
      if (!ok) {
        setError(apiError ?? "Generiranje nije uspjelo.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleDeleteVenue() {
    const scope =
      cjenikCount > 0 || itemCount > 0
        ? ` i sve unutra (${cjenikCount} ${cjenikCount === 1 ? "cjenik" : "cjenika"}, ${itemCount} ${itemCount === 1 ? "stavku" : "stavki"})`
        : "";
    const confirmed = confirm(`Obrisati objekt "${venueNaziv}"${scope}? Ova radnja se ne može poništiti.`);
    if (!confirmed) return;

    setError(null);
    setLoading("delete");
    try {
      const { ok, error: apiError } = await apiFetch(`/api/venues/${venueId}`, { method: "DELETE" });
      if (!ok) {
        setError(apiError ?? "Brisanje objekta nije uspjelo.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGenerate}
          disabled={loading !== null}
          className="btn-primary rounded px-4 py-2 font-bold disabled:opacity-50"
        >
          {loading === "generate" ? "Generiranje..." : "Generiraj/Ažuriraj cjenik"}
        </button>
        <button
          onClick={handlePublishToggle}
          disabled={loading !== null}
          className="rounded px-4 py-2 border border-navy/30 font-bold disabled:opacity-50"
        >
          {status === "published"
            ? loading === "publish"
              ? "..."
              : "Povuci objavu"
            : loading === "publish"
              ? "..."
              : "Objavi cjenik"}
        </button>
        <a
          href={`/api/venues/${venueId}/qr?format=png&download=1`}
          className="rounded px-4 py-2 border border-navy/30 font-bold"
        >
          Preuzmi QR (PNG)
        </a>
        <a
          href={`/api/venues/${venueId}/qr?format=svg&download=1`}
          className="rounded px-4 py-2 border border-navy/30 font-bold"
        >
          Preuzmi QR (SVG)
        </a>
      </div>
      {error && <p className="text-alert text-sm">{error}</p>}
      <div>
        <button
          onClick={handleDeleteVenue}
          disabled={loading !== null}
          className="text-alert underline text-sm disabled:opacity-50"
        >
          {loading === "delete" ? "Brisanje..." : "Obriši objekt"}
        </button>
      </div>
    </div>
  );
}
