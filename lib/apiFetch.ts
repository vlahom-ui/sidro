export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  // HTTP status i sirovo tijelo greške — opcionalno, za pozivatelje kojima
  // treba više od generičke poruke (npr. strukturirani 409 s dodatnim poljima).
  status?: number;
  errorBody?: unknown;
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
    return { ok: false, data: null, error: message, status: res.status, errorBody: body };
  }

  return { ok: true, data: body as T, error: null, status: res.status };
}

function parseXhrBody(xhr: XMLHttpRequest): unknown {
  if (!xhr.responseText) return null;
  try {
    return JSON.parse(xhr.responseText);
  } catch {
    return null;
  }
}

/**
 * Isto ponašanje kao apiFetch (nikad ne baca, standardizirani { ok, data,
 * error } oblik), ali preko XMLHttpRequest umjesto fetch — fetch ne izlaže
 * napredak uploada, dok XHR-ov upload.onprogress omogućuje stvarni
 * postotak dok se datoteka šalje, prije nego server počne obradu.
 */
export function apiUploadFile<T = unknown>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<ApiResult<T>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onerror = () => resolve({ ok: false, data: null, error: NETWORK_ERROR });
    xhr.ontimeout = () => resolve({ ok: false, data: null, error: NETWORK_ERROR });

    xhr.onload = () => {
      const body = parseXhrBody(xhr);
      if (xhr.status < 200 || xhr.status >= 300) {
        const message =
          body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : GENERIC_ERROR;
        resolve({ ok: false, data: null, error: message, status: xhr.status, errorBody: body });
        return;
      }
      resolve({ ok: true, data: body as T, error: null, status: xhr.status });
    };

    xhr.send(formData);
  });
}
