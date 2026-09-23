# sidro

Generator i uvoznik cjenika sa sidrenom cijenom — samostalan Next.js proizvod za
sidroapp.com. Potpuno neovisan od `vlahom-ui/nextjs-boilerplate` / dubrovnikgastro.

## Postavljanje

1. `npm install` — **napomena o `xlsx`**: `package.json` sada forsira patchanu
   SheetJS verziju s `cdn.sheetjs.com` (v0.20.3) umjesto ranjive npm-registry
   verzije 0.18.5 (vidi CVE napomenu ispod). Taj CDN nije bio dostupan iz
   sandboxed razvojnog okruženja u kojem je ova promjena napravljena, pa
   `package-lock.json` u repou još uvijek odražava staru npm-registry
   verziju. Prvi `npm install` (ili `npm ci`) na stroju/CI-u s normalnim
   pristupom internetu će automatski dohvatiti ispravnu verziju s CDN-a i
   osvježiti lockfile — potvrđeno da `npm ci` pokušava taj fetch, samo je u
   ovom okruženju vraćen 403 zbog mrežne politike sandboxa, ne zbog
   SheetJS-a. Ako install ikad pukne na `xlsx` koraku, pokrenite
   `rm -rf node_modules package-lock.json && npm install` na mreži koja može
   pristupiti cdn.sheetjs.com.
2. Kopirati `.env.example` u `.env.local` i popuniti:
   - Novi, zaseban Supabase projekt (URL, anon key, service role key)
   - Novi Cloudflare Turnstile site/secret key za sidroapp.com
   - Novu Resend API key + verificiranu domenu sidroapp.com
3. Primijeniti migracije iz `supabase/migrations/` na Supabase projekt
   (`supabase db push` ili kroz Dashboard SQL editor), redom:
   `0001_init.sql` → `0002_security_fixes.sql` → `0003_drop_old_rate_limit_fn.sql`
   → `0005_check_email_exists.sql` → `0006_email_has_account_case_insensitive.sql`
   → `0004_admin_notifications.sql` (0004 zahtijeva prvo deployanu edge
   funkciju — vidi korak 5 — pa je na produkciji primijenjen zadnji;
   numerički redoslijed 0004/0005/0006 ne utječe na ispravnost jer su
   međusobno neovisni). `0002` i `0003` odražavaju sigurnosni popravak koji
   je već ručno primijenjen na produkcijskoj `sidro` Supabase bazi
   (search_path hardening na trigger funkcijama + `check_and_increment_rate_limit`
   sada koristi `auth.uid()` interno umjesto `p_user_id` parametra koji je
   pozivatelj mogao proizvoljno postaviti — vidi `lib/rateLimit.ts`, koji
   zato MORA primiti klijent sa sesijom korisnika, ne admin/service-role
   klijent, jer bi potonji uvijek dobio "authentication required" grešku).
   `0005`/`0006` dodaju `email_has_account(p_email)` — SECURITY DEFINER
   funkcija koja provjerava postoji li već račun s tim emailom (potvrđen
   ili ne) izravno u `auth.users`, jer `signUp()` namjerno vraća identičan
   odgovor za nov signup i za ponovljenu registraciju nepotvrđenog
   korisnika (sprječavanje enumeracije), pa se ta dva slučaja ne mogu
   pouzdano razlikovati samo iz `signUp()` odgovora.
4. U Supabase Auth postavkama omogućiti Turnstile captcha zaštitu (koristi se
   na loginu preko `captchaToken`; registracija dodatno verificira token
   server-side u `/api/auth/register`).
5. Deployati admin notifikacijsku edge funkciju:
   ```
   supabase functions deploy notify-admin
   supabase secrets set RESEND_API_KEY=... ADMIN_NOTIFICATION_EMAIL=... \
     RESEND_FROM_EMAIL="Sidro <noreply@sidroapp.com>" APP_URL=https://sidroapp.com \
     NOTIFY_ADMIN_WEBHOOK_SECRET=...
   ```
   i zamijeniti `<project-ref>` i `<webhook-secret>` placeholdere u
   `supabase/migrations/0002_admin_notifications.sql` prije primjene.
6. `npm run dev`

## Struktura

- `app/` — Next.js App Router rute (javne, auth, dashboard, javna `/c/{slug}` stranica)
- `lib/parsers/` — ekstrakcija stavki iz PDF/DOCX/XLSX/CSV/XML/teksta
- `lib/security/` — validacija uploada, SSRF zaštita, CSV injection zaštita
- `lib/generate/` — generiranje .csv/.xml cjenika i JSON-LD (schema.org)
- `supabase/migrations/` — SQL shema, RLS politike, storage bucketi
- `supabase/functions/notify-admin/` — edge funkcija za admin notifikacije

## Poznata ograničenja / sljedeći koraci

- Format naziva generirane datoteke (`lib/generate/filename.ts`) slijedi
  HOK-ov referentni primjer (`TRG_ZAGREBACKA10_001_0001_20261001_0755.csv`):
  oblik objekta i adresa se normaliziraju (hrvatski dijakritici transliterirani,
  uppercase, samo `[A-Z0-9]`, adresa ograničena na 30 znakova), oznaka objekta
  je 3-znamenkasta (trenutno uvijek redni broj objekta po vlasniku — podrška za
  više poslovnica po objektu nije implementirana), broj pohrane je
  `generated_files.version_number` na 4 znamenke, a vremenska oznaka je UTC
  `generated_at`. Napomena: pravilo normalizacije ne skraćuje `oblik_objekta`
  na kod poput "TRG" (npr. "Trgovina" → "TRGOVINA", ne "TRG") jer je to
  slobodno tekstualno polje bez fiksnog popisa kodova — ako se želi točna
  HOK kraticu, treba definirati mapping tablicu po vrsti djelatnosti. Ako
  oblik/adresa nakon normalizacije daju prazan segment, koristi se
  `NEPOZNATO` i upisuje se upozorenje u `audit_log`.
- Zip-bomb zaštita za DOCX/XLSX oslanja se na 15 MB limit uploada + timeout
  parsiranja; nema dedicated zip-entry inspekcije prije raspakiravanja.
- `xlsx` (SheetJS) — vidi napomenu o CDN override-u u koraku 1 postavljanja.
- Ekstrakcija stavki iz nestrukturiranih izvora (PDF, DOCX, copy-paste, URL)
  koristi heurističko prepoznavanje redaka oblika "naziv ... cijena" —
  korisnik uvijek pregledava/ispravlja rezultat prije spremanja.
- Dodavanje slika s URL-a (bulk scraping + fuzzy matching, `image_candidates`)
  nije implementirano u ovoj fazi.
- **OCR fallback za PDF** (`lib/parsers/ocr.ts`): kad standardna tekst-ekstrakcija
  ne nađe nijednu stavku (tipično print-ready PDF s tekstom pretvorenim u
  krivulje/outline), automatski se pokreće rasterizacija (pdfjs-dist +
  @napi-rs/canvas) + OCR (tesseract.js, jezici hrv+eng) nad do 20 stranica,
  s per-page (15s) i ukupnim (45s) timeoutom te limitom rezolucije (2000px).
  Jezični podaci (`lib/ocr-data/*.traineddata.gz`, ~3.7MB) su bundlani u
  repo — OCR radi potpuno offline, bez mrežnog pristupa u runtimeu. Ruta
  `/api/venues/[venue]/import/upload` ima `maxDuration = 60` (Vercel) i
  `next.config.mjs` eksplicitno uključuje `lib/ocr-data/**` u serverless
  bundle preko `outputFileTracingIncludes` (dinamički fs putevi se ne prate
  automatski). Napomena: ove tri nove ovisnosti (`tesseract.js-core`,
  `@napi-rs/canvas-linux-x64-gnu`, `pdfjs-dist`) zajedno dodaju ~115MB u
  node_modules — Next.jev file-tracing bi trebao uključiti samo stvarno
  korištene datoteke u konačni serverless bundle, ali vrijedi provjeriti
  veličinu Vercel funkcije nakon prvog deploya (limit je 250MB unzipped).
- `/privacy` sadrži finalni tekst Politike privatnosti (Meridian 18 d.o.o.).
  `/terms` je i dalje placeholder dok tekst Uvjeta korištenja ne stigne.
