export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

const NETWORK_ERROR = "Nije moguće povezati se sa serverom. Provjerite internetsku vezu i pokušajte ponovno.";
const GENERIC_ERROR = "Došlo je do greške, pokušajte ponovno.";

/**
 * Zamjena za direktan `fetch` + `.json()` na svim internim API rutama.
 * Nikad ne baca — mrežnu grešku, prazan odgovor i ne-JSON tijelo pretvara u
 * standardizirani { ok, data, error } oblik, tako da pozivatelj uvijek ima
 * poruku prikazivu korisniku umjesto neuhvaćene iznimke koja zamrzne formu.
 */
export async function apiFetch<T = unknown>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    return { ok: false, data: null, error: NETWORK_ERROR };
  }

  const text = await res.text().catch(() => "");
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : GENERIC_ERROR;
    return { ok: false, data: null, error: message };
  }

  return { ok: true, data: body as T, error: null };
}
