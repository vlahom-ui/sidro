import "server-only";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 8000;

function ipToLong(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const long = ipToLong(ip);
  const ranges: [string, number][] = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10], // CGNAT
    ["127.0.0.0", 8],
    ["169.254.0.0", 16], // link-local, uklj. cloud metadata 169.254.169.254
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["224.0.0.0", 4],
  ];
  return ranges.some(([base, prefix]) => {
    const baseLong = ipToLong(base);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (long & mask) === (baseLong & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fe80:") || // link-local
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") || // unique local
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // nepoznat format — odbij
}

export class SsrfBlockedError extends Error {}

/**
 * Dohvaća tuđu URL adresu sa zaštitom protiv SSRF-a: samo http/https,
 * DNS razrješenje se provjerava protiv privatnih/internih IP raspona,
 * ograničeno vrijeme čekanja i ograničena veličina odgovora.
 */
export async function safeFetchText(targetUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new SsrfBlockedError("Nevažeća adresa.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfBlockedError("Dopušteni su samo http/https URL-ovi.");
  }

  const { address } = await lookup(parsed.hostname).catch(() => {
    throw new SsrfBlockedError("Adresa se ne može razriješiti.");
  });

  if (isPrivateIp(address)) {
    throw new SsrfBlockedError("Pristup internim/privatnim adresama nije dopušten.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "manual", // ručno pratimo redirekcije da izbjegnemo SSRF preko redirecta
      headers: { "User-Agent": "SidroBot/1.0 (+https://sidroapp.com)" },
    });

    if (res.status >= 300 && res.status < 400) {
      throw new SsrfBlockedError("Preusmjeravanja nisu dopuštena.");
    }

    if (!res.ok) {
      throw new SsrfBlockedError(`Dohvat nije uspio (status ${res.status}).`);
    }

    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new SsrfBlockedError("Odgovor je prevelik.");
    }

    const reader = res.body?.getReader();
    if (!reader) return await res.text();

    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new SsrfBlockedError("Odgovor je prevelik.");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
  } finally {
    clearTimeout(timeout);
  }
}
