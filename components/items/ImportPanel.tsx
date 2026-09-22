"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExtractedItem } from "@/lib/parsers/heuristics";
import { ImportReview } from "./ImportReview";

type Mode = "upload" | "url" | "tekst";

export function ImportPanel({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedItem[] | null>(null);

  const [urls, setUrls] = useState(["", "", ""]);
  const [text, setText] = useState("");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fileInput = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Odaberite datoteku.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/venues/${venueId}/import/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Uvoz nije uspio.");
        return;
      }
      setExtracted(data.items);
    } finally {
      setLoading(false);
    }
  }

  async function handleUrlImport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const filledUrls = urls.map((u) => u.trim()).filter(Boolean);
    if (filledUrls.length === 0) {
      setError("Unesite barem jedan URL.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/import/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: filledUrls }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Uvoz nije uspio.");
        return;
      }
      setExtracted(data.items);
    } finally {
      setLoading(false);
    }
  }

  async function handleTextImport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) {
      setError("Zalijepite tekst cjenika.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/import/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Uvoz nije uspio.");
        return;
      }
      setExtracted(data.items);
    } finally {
      setLoading(false);
    }
  }

  if (extracted) {
    return (
      <ImportReview
        venueId={venueId}
        initialItems={extracted}
        onSaved={(count) => {
          setExtracted(null);
          setText("");
          setUrls(["", "", ""]);
          alert(`Spremljeno ${count} stavki.`);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 text-sm">
        {(["upload", "url", "tekst"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded border ${
              mode === m ? "bg-navy text-navy-light border-navy" : "border-navy/30"
            }`}
          >
            {m === "upload" ? "Upload datoteke" : m === "url" ? "Uvoz s URL-a" : "Zalijepi tekst"}
          </button>
        ))}
      </div>

      {mode === "upload" && (
        <form onSubmit={handleUpload} className="flex flex-col gap-3 max-w-md">
          <p className="text-sm opacity-70">PDF, DOCX, XLS/XLSX, CSV ili XML s postojećim cjenikom (maks. 15 MB).</p>
          <input type="file" name="file" accept=".pdf,.docx,.xlsx,.csv,.xml" className="text-sm" />
          <button type="submit" disabled={loading} className="btn-primary rounded px-4 py-2 font-bold self-start disabled:opacity-50">
            {loading ? "Obrada..." : "Uvezi datoteku"}
          </button>
        </form>
      )}

      {mode === "url" && (
        <form onSubmit={handleUrlImport} className="flex flex-col gap-3 max-w-md">
          <p className="text-sm opacity-70">Do 3 URL-a objekata koji već imaju objavljen cjenik.</p>
          {urls.map((u, i) => (
            <input
              key={i}
              type="url"
              placeholder="https://..."
              value={u}
              onChange={(e) => setUrls((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
              className="border border-navy/30 rounded px-3 py-2 bg-transparent text-sm"
            />
          ))}
          <button type="submit" disabled={loading} className="btn-primary rounded px-4 py-2 font-bold self-start disabled:opacity-50">
            {loading ? "Dohvaćanje..." : "Uvezi s URL-a"}
          </button>
        </form>
      )}

      {mode === "tekst" && (
        <form onSubmit={handleTextImport} className="flex flex-col gap-3 max-w-md">
          <p className="text-sm opacity-70">Zalijepite cjenik iz emaila, bilježnice ili Google Docs-a.</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="border border-navy/30 rounded px-3 py-2 bg-transparent text-sm"
          />
          <button type="submit" disabled={loading} className="btn-primary rounded px-4 py-2 font-bold self-start disabled:opacity-50">
            {loading ? "Obrada..." : "Uvezi tekst"}
          </button>
        </form>
      )}

      {error && <p className="text-alert text-sm">{error}</p>}
    </div>
  );
}
