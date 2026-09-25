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
   → `0007_price_history_trigger_security_definer.sql`
   → `0008_venue_default_tip.sql`
   → `0009_rls_performance_optimization.sql`
   → `0010_item_groups.sql`
   → `0011_cjenici.sql`
   → `0012_image_import_source_type.sql`
   → `0013_first_seen_at_nullable.sql`
   → `0014_venue_kategorije.sql` → `0015_cjenici_kategorije.sql` (0014
   uvodi kategorizaciju na razini objekta, 0015 je odmah ispravlja na razinu
   cjenika — vidi napomenu uz taj bullet niže; oba se moraju primijeniti
   redom da baza završi u ispravnom stanju)
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
- **Uvoz izravno iz fotografije (JPG/PNG)** (`extractItemsFromImageViaOcr()`
  u `lib/parsers/ocr.ts`): fotografija (mobitelom slikan jelovnik/cjenik, ne
  skeniran u PDF) nikad nema tekstualni sloj, pa se ne pokušava pasivna
  ekstrakcija — ide se izravno u isti Tesseract hrv+eng pipeline koji koristi
  PDF OCR fallback, samo bez koraka rasterizacije iz vektora (slika je već
  rasterizirana na izvoru). Whitelist (`lib/security/fileValidation.ts`)
  proširen uz istu magic-byte provjeru (JPEG `FF D8 FF`, PNG `89 50 4E 47`,
  isti `file-type` paket kao za ostale formate — ne oslanja se na
  ekstenziju/Content-Type). Limit rezolucije prije OCR-a je 4000px po dužoj
  stranici
  (veći nego kod PDF rasterizacije jer je fotografija već rasterizirana pa
  treba nešto veću rezoluciju da tekst ostane čitljiv nakon eventualnog
  smanjenja), s 30s timeoutom. `import_source_type` enum proširen na 'jpg'/
  'png' (`0012_image_import_source_type.sql`). HEIC (čest format s iPhonea)
  namjerno izostavljen — zahtijeva dodatnu native biblioteku za dekodiranje
  koja nije trivijalna u serverless okruženju; korisnik se za sad upućuje
  na JPG/PNG.
- `/privacy` i `/terms` sadrže finalni pravni tekst (Meridian 18 d.o.o.).
- Heuristički parser (`lib/parsers/heuristics.ts`, `extractItemsFromText`)
  prepoznaje i cijene bez decimala (npr. "35 €"), uz obavezan valutni
  simbol/oznaku (€/eur/kn) za takve slučajeve — bez toga bi svaki broj na
  kraju retka (količina, broj stranice...) lažno prošao kao cijena. Također
  podržava jelovnike gdje su naziv (caps), opis i cijena na tri odvojena
  retka, ne samo "naziv ... cijena" na istom retku.
- Sve interne API rute (`app/api/**/route.ts`) omotane su `withErrorHandling`
  helperom (`lib/apiRoute.ts`) koji svaku neuhvaćenu iznimku pretvara u
  strukturiran `{ error: "..." }` JSON odgovor umjesto golog 500-a bez
  tijela. Svi klijentski pozivi prema tim rutama idu kroz `apiFetch()`
  helper (`lib/apiFetch.ts`) koji provjerava `response.ok` prije `.json()` i
  hvata mrežne greške, vraćajući standardizirani `{ ok, data, error }` oblik
  — sprječava da forma ostane zaglavljena u "Spremanje..." stanju bez ikakve
  poruke korisniku kod pada API poziva.
- `record_price_history()` trigger (na `items` insert/update) mora biti
  `security definer` (vidi `0007_price_history_trigger_security_definer.sql`)
  jer `price_history` ima RLS bez INSERT/UPDATE policy za autentificirane
  korisnike — bez toga svaki upis u `items` (pojedinačni, uvoz, izmjena
  cijene) pada s "sve ili ništa" rollbackom cijele izjave. Isti obrazac kao
  `check_and_increment_rate_limit` nad `rate_limits`.
- Pregled uvezenih stavki (`ImportReview`) ima bulk-edit traku: "odaberi
  sve" checkbox u headeru, te za odabrane retke masovnu promjenu tipa
  (Proizvod/Usluga) i/ili cijene odjednom.
- `venues.default_tip` (nullable, postavlja se na formi "Stvori objekt") je
  objekt-razinski default za tip novih stavki — primjenjuje se na uvoz (PDF/
  URL/tekst/CSV/XML/XLSX/OCR, preko `applyDefaultTip()` u
  `lib/parsers/heuristics.ts`) i pre-popunjava tip na formi "+ Dodaj stavku".
  Ne ograničava objekt na jedan tip, samo mijenja početnu vrijednost; tip se
  i dalje može mijenjati pojedinačno ili bulk-akcijom. Za CSV/XML/XLSX
  (`lib/parsers/structured.ts`) default se primjenjuje SAMO na retke bez
  eksplicitnog tip stupca — `ExtractedItem.tipExplicit` označava retke gdje
  je tip stvarno naveden u izvoru (npr. izvezeno iz drugog sustava), i
  `applyDefaultTip()` te retke nikad ne prepisuje, jer bi prepisivanje
  namjerno unesenog podatka bilo gore od heurističkog nagađanja. Tekst/PDF/
  OCR/URL nemaju vlastiti tip podatak pa se na njih default primjenjuje bez
  iznimke.
- Nova stavka (uvoz i ručno dodavanje) dobiva `sidrena_cijena` = `cijena` po
  defaultu umjesto praznog polja. Kod ručnog dodavanja (`ItemForm`) sidrena
  cijena prati unos cijene dok je korisnik ručno ne izmijeni; kod uvoza se
  postavlja izravno u `items/batch` ruti. Postojeći "Postavi sidrenu cijenu
  = trenutnu (za prazne)" bulk gumb ostaje za stavke koje ostanu prazne
  (npr. ručno očišćene).
- Upload datoteke (`ImportPanel`) prikazuje stvaran postotak napretka
  uploada preko `XMLHttpRequest.upload.onprogress`
  (`apiUploadFile()` u `lib/apiFetch.ts`, `fetch` ne izlaže tu informaciju),
  a nakon 100% (server obrađuje datoteku) prikazuje "Obrada datoteke...".
- Performance optimizacija (`0009_rls_performance_optimization.sql`, prema
  Supabase performance advisoru): svih 12 RLS politika s `auth.uid()`
  promijenjeno u `(select auth.uid())` (planner evaluira jednom po upitu
  umjesto po retku — isto ponašanje, brže na skali) + dodani nedostajući
  indeksi na `consents.venue_id` i `image_candidates.matched_item_id`.
  Namjerno NE dirano: dvostruke permisivne SELECT politike na
  `venues`/`items`/`generated_files` (vlasnička + javna — namjeran dizajn,
  spajanje u OR bi otežalo čitljivost za zanemarivu dobit) i "unused index"
  nalazi (baza premlada da bi bili mjerodavni).
- **Grupirane usluge s varijantnim cijenama** (`0010_item_groups.sql`) —
  rješava slučaj cjenika gdje cijena ovisi o broju osoba, izboru modela/
  plovila ili kombinaciji dvije varijable (npr. turoperatori, iznajmljivanje).
  `items` se ne mijenja u svrsi — i dalje flat, jedan redak = jedna cijena,
  CSV/XML izvoz identičan kao prije (generatori u `lib/generate/files.ts`
  čitaju samo `items.naziv`/`cijena`, ne diraju grupiranje). Iznad toga je
  tanak sloj: `item_groups` (naziv/opis/trajanje grupe) + `items.item_group_id`
  i `items.variant_label`. `items.naziv` za varijantu se sastavlja kao
  `"{grupa.naziv} - {variant_label}"` u trenutku spremanja
  (`composeVariantName()` u `lib/itemGroups.ts`), preko nove rute
  `POST /api/venues/[venue]/item-groups` koja u jednom pozivu stvara grupu i
  sve varijante (uz kompenzacijski rollback grupe ako insert varijanti padne,
  budući da PostgREST ovdje ne daje pravu cross-request transakciju).
  UI (`GroupedItemForm`) podržava jednostavnu 1D listu (uz "brzi unos
  raspona" za broj osoba, s ispravnom hrvatskom sklonidbom osoba/osobe) i 2D
  matricu (dvije osi vrijednosti × cijena po ćeliji, npr. PAX × broj čaša na
  degustaciji). `ItemsManager` prikazuje grupirane stavke kolapsirano
  (naziv grupe + broj varijanti, klik širi pojedinačne retke — uređuju se
  kroz postojeći `ItemForm` mehanizam, bez posebne logike). Javna `/c/{slug}`
  stranica prikazuje grupu kao jednu karticu s tablicom varijanti
  (`item_groups` ima vlastitu RLS politiku, `item_groups_public_select`, po
  istom obrascu kao `items_public_select`). `buildJsonLd()` generira jedan
  `Service`/`Product` entitet po grupi s po jednim `Offer` po varijanti u
  `offers` nizu; negrupirane stavke zadržavaju identično ponašanje kao prije.
  Namjerno izvan opsega: auto-parser (PDF/OCR/URL/tekst) se ne proširuje da
  pokuša prepoznati multi-tier tablice — rizik pogrešno parsirane cijene
  objavljene kao "službena" je gori od ručnog unosa kroz ovaj UI.
- **Europski format tisućica u price-parseru** (`lib/parsers/heuristics.ts`)
  — `PRICE_RE` je ranije lomio "1.195 €" na naziv "...1." + cijenu 195.00,
  jer je `\d{1,5}` stao na prvoj točki misleći da je decimalni zapis. Regex
  sad ima zasebnu granu za `\d{1,3}(?:\.\d{3})+` (grupe od TOČNO 3 znamenke
  nakon točke = razdjelnik tisućica, za razliku od TOČNO 2 znamenke kod
  običnog decimalnog zapisa) — s obaveznom valutom kad nema decimalnog
  zareza (isto pravilo kao za cijele brojeve bez decimala) i bez nje kad ga
  ima (npr. "1.195,50 €"). `parsePrice()` normalizira: zarez u stringu znači
  "sve točke prije njega su tisućice, ukloni ih"; bez zareza ali s grupama
  od točno 3 znamenke nakon točke znači isto; inače nepromijenjeno (postojeće
  ponašanje za "35,00 €" i "35 €" ostaje netaknuto).
- **Zaštita od duplikata pri uvozu** (`items/batch` ruta) — privremena
  zakrpa dok korisnik nema svjestan odabir cjenika: prije insertanja
  provjerava postoje li već stavke s identičnim (normaliziran naziv, cijena
  zaokružena na centima) u istom cjeniku (ili istom objektu za stavke bez
  cjenika), i ako da, vraća 409 s popisom dupliciranih naziva umjesto
  tihog dupliciranja — klijent nudi "Svejedno dodaj" koji ponovno šalje
  zahtjev s `force: true`.
- **Cjenici — kontejner iznad items za organizaciju po objektu**
  (`0011_cjenici.sql`) — rješava slučaj kad objekt ima više cjenika (npr.
  "Restoranski meni" vs "Cjenik izleta 2026", ili stara/nova verzija istog
  cjenika kroz vrijeme). NE mijenja zakonski izvoz: `items/[venue]/generate`
  ruta i dalje agregira SVE proizvod/usluga stavke iz SVIH cjenika objekta
  u jednu datoteku po tipu (nije dirana). `cjenici` tablica (samo
  vlasnički RLS — cjenici se nigdje ne prikazuju javno odvojeno) +
  `items.cjenik_id`/`item_groups.cjenik_id` (`on delete cascade` — brisanje
  cjenika briše i njegove stavke, namjerno predvidljivija radnja nego da
  odjednom postanu "negrupirane"). Postojeće stavke bez `cjenik_id` ostaju
  vidljive kroz posebnu "Bez cjenika — starije stavke" opciju u
  `CjenikSelector`u, i dalje uključene u izvoz.
  `CjenikWorkspace` orkestrira: `CjenikSelector` (dropdown + "+ Novi
  cjenik", prvi posjet bez ijednog cjenika prisiljava kreiranje prvog),
  pamćenje zadnje odabranog cjenika po objektu u `localStorage`, filtriranje
  `items`/`item_groups` na klijentu prema odabranom cjeniku (URL query param
  `?cjenik=` kao initial vrijednost, npr. s `/dashboard/{venue}` liste).
  Ponovni uvoz u cjenik koji već ima stavke nudi izričit izbor "Dodaj ovim
  stavkama" (prolazi kroz duplicate-check gore) ili "Zamijeni postojeće
  stavke u ovom cjeniku" (`mode: "replace"` — briše postojeće stavke tog
  cjenika prije insertanja, uz `confirm()` potvrdu). `CjeniciList` na
  `/dashboard/{venue}` briše cjenik bez dodatne potvrde ako je prazan, uz
  potvrdu s točnim brojem stavki ako nije.
- **Ispravno postavljanje `first_seen_at` prema stvarnoj objavi objekta**
  (`0013_first_seen_at_nullable.sql`) — zakonski relevantan datum "prvog
  pojavljivanja" stavke je kad postane vidljiva javnosti (objava cjenika),
  ne kad je administrator utipkao podatke dok je objekt još `status =
  'draft'`. Prije ovog popravka `items.first_seen_at` je dobivao `now()`
  automatski kod insertanja u bazu, pa bi stavke dodane u draft objekt
  dobile pogrešan (prerani) datum. Migracija miče `not null default now()`
  s `items.first_seen_at` (samo shema — namjerno NE dira postojeće retke,
  njihove već postavljene vrijednosti ostaju kakve jesu makar možda
  netočne iz razdoblja prije popravka; popravak vrijedi samo za nove
  stavke od sad nadalje). Logika je eksplicitna u aplikacijskom kodu, ne
  skriveni DB trigger (transparentnije, lakše za debug): centralni
  `computeFirstSeenAt(venueStatus)` (`lib/firstSeenAt.ts`) vraća `now()`
  ako je objekt već `'published'`, inače `null` — poziva se iz sva tri
  mjesta gdje stavka nastaje (`items` ruta za ručni unos, `items/batch`
  za uvoz, `item-groups` za grupirane/varijantne usluge). Kad se objekt
  objavi (`POST /api/venues/[venue]/publish`, `status: 'published'`),
  ruta bulk-ažurira SVE stavke tog objekta gdje je `first_seen_at` još
  `null` na `now()` — uvjet `is("first_seen_at", null)` čini ovo
  idempotentnim (siguran ponovni poziv, ne dira stavke koje već imaju
  datum). `ItemsManager` prikazuje datum po stavci ("Prvi put u ponudi:
  24.9.2026.") ili, dok je `null`, "Još nije objavljeno — datum će se
  postaviti kod objave objekta" — vidljiv dokaz za potrebe inspekcije.
  `ItemForm`-ov postojeći hint ("stavka nije postojala 10.9.2026.") sad
  eksplicitno provjerava `first_seen_at !== null` prije usporedbe datuma,
  jer se ne smije prikazati dok pravi datum još nije poznat.
- **Sidrova poslovna kategorizacija cjenika** (`0014_venue_kategorije.sql` →
  `0015_cjenici_kategorije.sql`) — dvorazinska taksonomija: 8 glavnih
  kategorija × ~5 podkategorija svaka (41 ukupno), odabir kroz pretraživi
  combobox (`KategorijaCombobox`). **Ovo je Sidrova vlastita interna
  kategorizacija radi organizacije, NE tvrdnja o službenom zakonskom
  šifrarniku** (npr. NKD ili razredba iz Zakona o ugostiteljskoj
  djelatnosti) — napomena uz polje na formi ("Interna kategorizacija radi
  organizacije — ne službeni šifrarnik") eksplicitno to naglašava da se ne
  stvori pogrešan dojam kod korisnika ili inspekcije. Kategorija je vezana
  za **cjenik** (`cjenici.podkategorija_id`), ne za cijeli objekt — jedan
  objekt može imati više cjenika različitih kategorija (npr. "Cjenik
  izleta" pod Turističke usluge i "Restoranski meni" pod Ugostiteljski
  objekt unutar iste Villa Dubrovnik), pa kategorija logično pripada
  cjeniku. `0014` je prvi pokušaj ovog featurea pogrešno vezao
  kategorizaciju za `venues` (cijeli objekt) — `0015` to ispravlja u istoj
  rundi, prije stvarne upotrebe (0 objekata je ikad imalo postavljen
  venue-razinski `podkategorija_id`): briše `venue_kategorije`/
  `venue_podkategorije`/`venues.podkategorija_id` iz 0014 i uvodi ispravnu
  shemu, `kategorije`/`podkategorije` (bez `venue_` prefiksa) +
  `cjenici.podkategorija_id`. `kategorije`/`podkategorije` su referentne
  tablice (RLS `for select using (true)` — statička taksonomija, ništa
  osjetljivo). **`venues.oblik_objekta`** (zakonski naziv izlazne
  datoteke, `lib/generate/filename.ts`) ostaje potpuno odvojen i
  nepromijenjen — ova kategorizacija u njega nikad ne ulazi, generirani
  .csv/.xml je i dalje identičan. Polje je opcionalno na formi "+ Novi
  cjenik" (`CjenikSelector`, server dohvaća `podkategorijaId` s
  klijenta i verificira da postoji prije spremanja) — odabrana kategorija
  se prikazuje uz naziv cjenika na `/cjenik` stranici i na listi cjenika na
  `/dashboard/{venue}` (`CjeniciList`), radi lakšeg snalaženja kod objekata
  s više cjenika. Nullable, bez defaulta: postojeći cjenici (svi kreirani
  prije ove promjene) zadržavaju `podkategorija_id = null` — ne pokušava se
  retroaktivno pogoditi kojoj bi kategoriji odgovarali.
- **Popravak prikaza nakon uvoza** (`ItemsManager.tsx`) — nakon spremanja
  uvezenih stavki (OCR/CSV/URL/tekst) ili grupirane usluge, stavke su se
  ispravno spremale u bazu, ali se nisu prikazale na ekranu dok korisnik
  ručno nije osvježio stranicu. Uzrok: `ItemsManager` je keyed po
  odabranom cjeniku u `CjenikWorkspace`-u (remounta se kod PREBACIVANJA
  cjenika), pa `useState(initialItems)` postavlja lokalni state samo kod
  prvog mounta — uvoz/grupirane usluge pišu izravno u bazu preko vlastitih
  ruta (ne kroz `ItemsManager`ov `handleCreate`), pa nakon `router.refresh()`
  roditelj pošalje svježi `initialItems`/`initialItemGroups` prop na ISTI
  cjenik bez remounta, a bez sync efekta lokalni state ostaje zaglavljen na
  staroj vrijednosti. Popravljeno dodavanjem `useEffect` resync-a — isti
  obrazac koji već ispravno postoji u `CjenikWorkspace.tsx`.
- **Trajna potvrda spremanja uvoza + kontinuirani uvoz u isti cjenik**
  (`ImportPanel.tsx`) — zamjena blokirajućeg `alert("Spremljeno N stavki.")`
  trajnom porukom iznad forme za uvoz ("✓ Cjenik spremljen — dodano N
  stavki u '{cjenik}' (ukupno M stavki u cjeniku)."), koja ne nestaje sama
  nego ostaje dok korisnik ne pokrene novi uvoz ili klikne "+ Dodaj još
  stavki u cjenik". Rješava slučaj kad korisnik ima više fotografija
  jednog cjenika (npr. višestranični jelovnik) — nakon svakog spremanja
  forma za uvoz je odmah spremna za sljedeću datoteku, bez gubitka
  konteksta ili potrebe za ručnim potvrđivanjem popup dijaloga.
- **Bolji UX za "Postavi sidrenu cijenu = trenutnu"** (`ItemsManager.tsx`)
  — gumb se sad prikazuje SAMO dok postoji barem jedna stavka bez sidrene
  cijene (`itemsMissingAnchor > 0`) — nema smisla nuditi radnju koja nema
  na što djelovati. Naziv gumba unaprijed pokazuje broj praznih stavki
  (npr. "...( 3 prazne)") da korisnik zna opseg prije klika, umjesto da to
  sazna tek iz poruke nakon. Poruke nakon klika stilizirane kao istaknuti
  paneli (✓ navy-light panel za uspjeh, ⚠ alert-obrubljeni panel za
  grešku) umjesto gole rečenice, dosljedno stilu uvedenom za potvrdu uvoza.
  Poruka za slučaj "sve stavke već imaju sidrenu cijenu" sad je eksplicitno
  drugačija ("nema promjena") od slučaja "postavljeno za N stavki" —
  ranije je oboje prolazilo kroz identičan generički tekst.
- **Foolproof hardening runda — 3 stvarna buga nađena sustavnim testiranjem
  parsera** (ne ad-hoc) — generirani su sintetički PDF/DOCX/XLSX/CSV/foto
  fixturi za sva 3 tipa objekta (restoran/trgovina/turoperator) s hrvatskim
  dijakriticima, i stvarne parser funkcije iz repozitorija pokrenute
  lokalno (izvan HTTP rute/auth, direktan Node poziv) protiv njih:
  - `app/api/venues/[venue]/import/upload/route.ts` — kad `pdf-parse`
    baci iznimku na inače ispravnom PDF-u (potvrđeno: reportlab-generirani
    PDF -> "bad XRef entry"/"Command token too long", vjerojatno pogađa i
    PDF-ove iz drugih generatora koje ovaj stariji bundlani pdf.js ne zna
    parsirati), ruta je ODMAH vraćala 422 bez pokušaja OCR fallbacka —
    iako je OCR fallback (potpuno odvojen put preko `pdfjs-dist`
    rasterizacije, ne koristi `pdf-parse`) na ISTOM PDF-u uspješno izvukao
    stavke. Sad se iznimka iz standardne PDF ekstrakcije tretira kao "nema
    teksta" i pušta na OCR fallback, umjesto odmah odustati.
  - `lib/parsers/heuristics.ts` — "3-retka" lookback (naziv na CAPS retku
    iznad cijene) tražio je CAPS kandidata do 4 retka unatrag bez
    ograničenja koliko je udaljen od trenutne cijene, pa je za obrazac
    "Naziv (mixed-case, bez CAPS-a) / cijena" (čest kod OCR-a fotografija
    i jednostavnih popisa, bez posebne stilizacije) mogao pogrešno
    "posuditi" nepovezan CAPS naslov dokumenta udaljen 2+ retka unatrag
    (npr. cijeli naslov "CJENIK IZLETA 2026" postao je naziv PRVE stavke
    ispod njega, dok su DRUGA i TREĆA stavka bile potpuno tiho izgubljene
    — nisu bile ni caps ni cijena redak pa nisu bile prepoznate ni kao
    naziv ni kao kategorija). Popravljeno: lookback sad strogo ograničen
    na dokumentirani obrazac (1 ili 2 retka), s eksplicitnim fallbackom na
    najbliži prethodni redak (bez obzira na veliko/malo slovo) kad nema
    pouzdanog CAPS kandidata u tom dosegu, i eksplicitnim isključenjem
    redaka koji izgledaju kao naslov dokumenta ("CJENIK ...", "JELOVNIK
    ...") iz kandidata za naziv stavke.
  - `components/items/ImportPanel.tsx` — uvoz s URL-a (`/api/venues/
    [venue]/import/url`) već je vraćao specifičan razlog po URL-u kad
    dohvat padne (SSRF blokada, nevažeća adresa, stranica ne odgovara —
    `lib/security/ssrf.ts` ima solidnu SSRF zaštitu: whitelist protokola,
    DNS provjera protiv privatnih raspona, ručno praćenje redirekcija,
    ograničenje veličine odgovora i preko content-length i streamano) —
    ali frontend je taj `results[].error` posve odbacivao i prikazivao
    samo generičko "Nije pronađena nijedna stavka za pregled." bez traga
    zašto. Sad se, kad nema nijedne izvučene stavke, prikazuje konkretan
    razlog po URL-u.
  Sve troje potvrđeno regresijskim testom u istoj test skripti nakon
  popravka (47 PASS / 0 FAIL) — vidi commit poruku za detalje metodologije
  (server-only paket privremeno stubban samo za trajanje lokalnog test
  skripta, vraćen na izvorno stanje odmah nakon, node_modules nije dio
  git repozitorija).
- **Popravak dead-end-a u pregledu uvoza kad nema izvučenih stavki**
  (`ImportReview.tsx`) — nađeno tijekom stvarnog klik-kroz testiranja
  (paralelna sesija s live pristupom pregledniku): kad uvoz vrati 0
  prepoznatih stavki, komponenta je prikazivala SAMO statičan tekst "Nije
  pronađena nijedna stavka za pregled." bez ijednog klikabilnog elementa
  — ni tabovi za odabir drugog načina uvoza ni gumb natrag nisu bili
  dostupni, korisnik je bio zaglavljen dok ručno ne osvježi stranicu.
  Dodan `onCancel` prop (iz `ImportPanel.tsx`, resetira `extracted` na
  `null` čime se forma za uvoz opet prikaže) i gumb "← Natrag na uvoz" u
  tom stanju. Dosljednosti radi, dodan je i opći gumb "Odustani" na
  glavni prikaz pregleda (kad ima stavki) — ni ondje prije nije postojao
  način izlaska iz pregleda osim stvarnog spremanja.
- **Oznaka nesigurnog naziva u pregledu uvoza** (`lib/parsers/heuristics.ts`,
  `ImportReview.tsx`) — nalaz iz stvarnog klik-kroz testiranja: "3-retka"
  obrazac (naziv/opis/cijena na odvojenim recima) bez IJEDNOG CAPS signala
  negdje u blizini nema pouzdan lokalni način razlikovati "ovo je naziv"
  od "ovo je opis ispod naziva" (potvrđeno testom: naziv i opis identične
  duljine u riječima ne daju razliku, jedini raniji signal — CAPS — po
  definiciji ovdje ne postoji). Radije se uvijek nešto pogodi nego stavka
  tiho nestane iz popisa (stariji bug — teško uočljivo u dugom popisu od
  stotine redaka), ali sad se takav pogodak eksplicitno OBILJEŽAVA: novo
  `ExtractedItem.nameUncertain` polje, postavljeno kad je naziv pogođen
  preko fallback grane BEZ pouzdanog CAPS kandidata u blizini. UI
  (`ImportReview`) prikazuje sažetak na vrhu ("N stavki ima nesiguran
  naziv..."), žuti obrub oko retka i ⚠ oznaku pored polja za naziv — isti
  vizualni jezik kao postojeće OCR upozorenje. Namjerno blago konzervativno
  (radije prijavi lažni pozitiv nego propusti stvaran slučaj): stavka se
  označava čim postoji BILO KOJI drugi ne-cijena redak dva iznad koji je
  teoretski mogao biti pravi naziv, čak i kad je algoritam u tom
  konkretnom slučaju ispravno pogodio (potvrđeno testom).
- **Dio 3 foolproof brief: error-handling audit bulk akcija/brisanja**
  — sustavan pregled (ne ad-hoc) svih bulk akcija, brisanja i grupiranih
  usluga za isti standard (loading prije await, disabled gumb, vidljiva
  greška, apiFetch svugdje umjesto raw fetch — potvrđeno grep-om da
  nijedna `.tsx` komponenta ne zaobilazi apiFetch/apiUploadFile wrapper).
  Dva stvarna nalaza i popravka:
  - `ImportReview.tsx` — "Postavi cijenu" bulk akcija (u pregledu uvoza)
    je tiho ne radila ništa za nevažeći unos (npr. "abc", "-5", "0") jer
    gumb provjerava samo da polje nije prazno, ne da sadrži valjan broj.
    Sad prikazuje "Cijena mora biti pozitivan broj." umjesto tihog no-opa.
  - `ItemsManager.tsx` — brisanje pojedinačne stavke nije imalo `disabled`
    stanje na gumbu dok DELETE zahtjev traje (za razliku od `CjeniciList`,
    koji to već ispravno ima po retku) — dodan isti `deletingId` obrazac
    radi dosljednosti i zaštite od dvostrukog klika tijekom zahtjeva.
  Ostalo provjereno i potvrđeno već na standardu (bez izmjene):
  `GroupedItemForm.tsx` (loading/error/disabled/odustani — sve ispravno),
  `CjeniciList.tsx`, `ChangePasswordForm.tsx`, `LoginForm.tsx`,
  `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`.
  **Značajan nalaz — nedostaju cijele funkcionalnosti, ne bug**: brisanje
  objekta (venue) i brisanje korisničkog računa **ne postoje nigdje u
  aplikaciji** — ni gumb, ni API ruta (`app/api/venues/[venue]/route.ts`
  s DELETE handlerom ne postoji uopće). Namjerno nisu izmišljeni/dodani u
  ovoj rundi (destruktivna funkcionalnost je proizvodna odluka, ne
  "popravak greške u postojećem kodu") — čeka eksplicitan zahtjev.
- **Samoposlužno brisanje objekta i korisničkog računa** — eksplicitno
  zatraženo nakon gornjeg audit nalaza. Dvije nove rute + dva nova UI-a:
  - `app/api/venues/[venue]/route.ts` (novi file, DELETE handler) —
    `assertVenueOwner`, prebrojava cjenike/stavke prije brisanja radi
    audit zapisa i UI potvrde, eksplicitno briše `audit_log` retke po
    `venue_id` PRIJE brisanja objekta (FK `audit_log.venue_id` je
    `on delete set null`, ne `cascade` — korisnik izričito traži brisanje
    tih redaka, ne osirotjele reference), zatim briše sam `venues` redak
    što FK cascade povlači `items`, `item_groups`, `price_history` (preko
    `items`), `cjenici`, `import_sources`, `generated_files` i
    `image_candidates`. Na kraju upisuje `venue_delete` audit zapis BEZ
    `venue_id` (objekt više ne postoji, FK bi pukao) — naziv/broj stavki
    idu u `details` kao tekst.
  - `components/VenueActions.tsx` — novi gumb "Obriši objekt", isti
    obrazac potvrde kao postojeće brisanje cjenika u `CjeniciList.tsx`
    (broj cjenika/stavki koji nestaju u `confirm()` dijalogu prije
    slanja zahtjeva). Nakon uspjeha, redirect na `/dashboard`.
  - `app/api/account/route.ts` (novi file, DELETE handler) — zahtijeva
    lozinku u tijelu zahtjeva i server-side ponovnu autentikaciju
    (`signInWithPassword`, isti obrazac kao `ChangePasswordForm`) prije
    ikakvog brisanja — sesijski cookie sam po sebi ne dokazuje "upravo
    sad za računalom". Briše `audit_log` retke i po `venue_id` (za sve
    objekte korisnika) i po `user_id` (retci bez `venue_id`, npr. login
    događaji — `audit_log.user_id` nema FK prema `auth.users` pa se ne
    bi obrisali sami od sebe). Zatim poziva
    `createAdminClient().auth.admin.deleteUser(user.id)` — service-role
    Admin API, jer obična RLS sesija ne može obrisati vlastiti
    `auth.users` redak. Brisanje tog retka FK cascade povlači SVE objekte
    korisnika (`venues.owner_user_id`) pa time i sve njihove
    items/cjenici/itd. kao gore, plus `consents` (`consents.user_id` je
    `on delete cascade`) — bez potrebe za ručnim brisanjem tih tablica.
    Na kraju upisuje `account_delete` audit zapis s `userId` (bez FK-a na
    `user_id`, dopušteno i nakon što redak u `auth.users` više ne
    postoji — namjerno zadržan trag da je račun obrisan).
  - `components/DeleteAccountForm.tsx` (novi file) — na `/account`, ispod
    `ChangePasswordForm`. Sažeti gumb "Obriši moj račun" koji otvara formu
    s poljem za lozinku, `confirm()` dijalogom s jasnim upozorenjem o
    nepovratnosti prije slanja, i inline error prikazom (npr. kriva
    lozinka). Nakon uspjeha: `supabase.auth.signOut()` na klijentu, pa
    redirect na `/?racun-obrisan=1` — `app/page.tsx` prikazuje kratku
    potvrdnu poruku kad je taj query param prisutan.
  - **Test — DB-level, NE end-to-end** (sandbox nema odlazni HTTPS pristup
    do `sidroapp.com`/`*.supabase.co`, pa live browser test iz ove sesije
    nije moguć): kroz Supabase MCP, na potpuno sintetičkim podacima (test
    `auth.users` retci s `@example.invalid` email adresama, obrisani
    odmah nakon testa, nikad stvarni korisnički podaci), ručno
    reproducirana TOČNA SQL logika obje rute:
    1. Brisanje objekta — kreiran sintetički venue sa po 1 retkom u
       `items`, `item_groups`, `price_history` (auto preko triggera),
       `cjenici`, `import_sources`, `generated_files`,
       `image_candidates`, `audit_log`; pokrenuta ista `DELETE FROM
       audit_log WHERE venue_id=...` + `DELETE FROM venues WHERE id=...`
       sekvenca — svih 8 tablica potvrđeno na 0 redaka nakon, korisnički
       redak namjerno netaknut (venue-delete ne smije obrisati račun).
    2. Brisanje računa — kreiran drugi sintetički korisnik s venueom,
       stavkom, DVA `audit_log` retka (jedan vezan uz venue, jedan bez
       venue_id) i jednim `consents` retkom; pokrenuto brisanje
       `audit_log` po `venue_id` i po `user_id`, pa `DELETE FROM
       auth.users WHERE id=...` (isti krajnji efekt kao Admin API poziv,
       budući da GoTrue interno radi obično SQL brisanje tog retka) —
       potvrđeno na 0: `auth.users`, `venues`, `items`, `audit_log`
       (oba retka) i `consents`.
    Oba sintetička test korisnika i sve povezane test podatke u
    potpunosti uklonjeni nakon testa (potvrđeno upitom, 0 preostalih
    `test-%@example.invalid` redaka). `npm run typecheck` i `npm run
    build` prolaze čisto. **Nije testirano** (izvan dosega DB-level
    testa, čeka korisnikovu live provjeru kao i dosad): stvaran klik na
    gumbe u pregledniku, UX poruka o krivoj lozinci uživo, ponašanje kad
    Admin API poziv (mrežni poziv prema GoTrue) padne usred zahtjeva.
- **UX poboljšanja — objedinjeni brief (5 stavki)**:
  1. **Dinamična labela glavnog CTA gumba** (`app/dashboard/[venue]/
     page.tsx`) — "Uredi cjenik (N stavki)" zamijenjen kontekstualnom
     labelom: "Kreiraj prvi cjenik" (0 cjenika), "Dodaj stavke u cjenik"
     (≥1 cjenik, 0 stavki), "Uredi cjenik (N stavki)" (≥1 stavka,
     nepromijenjeno).
  2. **Redizajn praznog stanja stranice objekta** (`app/dashboard/
     [venue]/page.tsx`, `components/VenueActions.tsx`) — "Generiraj/
     Ažuriraj cjenik" i QR gumbi/pregled skriveni dok `itemCount === 0`
     (generate) odn. `cjenikCount === 0 && itemCount === 0` (QR — vidljiv
     čim postoji BILO cjenik BILO stavka, ne samo cjenik, radi
     ispravnosti u rijetkom slučaju negrupiranih stavki bez cjenika,
     iako taj slučaj nije dohvatljiv kroz trenutni UI flow jer
     `CjenikWorkspace` ne prikazuje "+ Dodaj stavku" prije nego postoji
     barem jedan cjenik — obrađeno svejedno jer je API tehnički dopušta).
     Iznimka od doslovnog briefa, namjerno: "Objavi cjenik" ostaje
     vidljiv i kad `itemCount === 0` AKO je objekt već objavljen (`status
     === "published"`) — bez ovoga bi korisnik koji isprazni već
     objavljeni cjenik izgubio jedini UI put da povuče objavu. Tri prazne
     sekcije (Cjenici/Generirane datoteke/Izvori uvoza) spojene u jednu
     kratku poruku samo kad je objekt POTPUNO prazan (`cjenikCount === 0
     && itemCount === 0`); čim postoji cjenik ili stavka, sve tri sekcije
     prikazane odvojeno kao i prije (bez izmjene njihove interne "prazno"
     logike).
  3. **Javna stranica — grupiranje preuzimanja + upozorenje o
     zastarjelosti**:
     - `app/c/[slug]/page.tsx` — četiri ravnopravna gumba zamijenjena
       dvama redovima po zakonskoj kategoriji ("Cjenik proizvoda" /
       "Cjenik usluga", svaki s CSV/XML gumbima), red se prikazuje samo
       ako ta kategorija ima generiranu datoteku. Datoteke se i dalje NE
       spajaju (`generate` ruta ionako uvijek generira zasebne CSV/XML po
       tipu) — samo prezentacija grupirana.
     - `app/dashboard/[venue]/page.tsx` — upozorenje o zastarjelosti PO
       zakonskoj kategoriji: uspoređuje `max(items.updated_at)` s
       `max(generated_files.generated_at)` (samo `is_current`) za svaki
       tip zasebno; ako je stavka te kategorije izmijenjena NAKON zadnjeg
       generiranja te kategorije, prikazuje se vidljivo upozorenje iznad
       akcija ("Cjenik {proizvoda/usluga} nije ažuriran nakon zadnje
       izmjene stavki..."). Logika provjerena DB-level testom (Supabase
       MCP, sintetički venue s dvije kategorije — jednom svježom, jednom
       namjerno zastarjelom preko `UPDATE items ... SET cijena=...` nakon
       `generated_at` — SQL replika točne JS agregacije potvrdila očekivan
       rezultat za oba slučaja, podaci obrisani nakon testa).
  4. **Breadcrumb navigacija** (`components/Breadcrumb.tsx`, novi) —
     dodan na sve četiri `/dashboard/...` stranice (`dashboard/page.tsx`,
     `dashboard/[venue]/page.tsx`, `dashboard/[venue]/cjenik/page.tsx`,
     `dashboard/[venue]/audit/page.tsx`), npr. "Objekti / Villa Dubrovnik
     / Cjenik". Svaka razina osim zadnje je klikabilan link. Postojeći
     ad-hoc "← Natrag na objekt" link na cjenik stranici namjerno
     zadržan kao dodatna prečica (brief eksplicitno dopušta). Logo
     "sidro" u `DashboardHeader.tsx` je pri pregledu koda već bio Link na
     `/dashboard` (ranija implementacija) — provjereno, nije trebalo
     izmjenu.
  5. **In-app modal umjesto `window.confirm()`** (`components/
     useConfirm.tsx`, novi hook) — `useConfirm()` vraća `confirm(message,
     {confirmLabel?, cancelLabel?})` koji vraća `Promise<boolean>` (isti
     "await odluku" oblik kao `window.confirm()`, pa je zamjena na svakom
     pozivnom mjestu jednolinijska) i `ConfirmDialog` JSX element
     (fiksno pozicioniran overlay, Escape zatvara kao otkazivanje, fokus
     na "Odustani" gumb). Tekst poruka nepromijenjen, zamijenjena samo
     posuda. Svih 5 mjesta gdje je postojao `confirm()`:
     `VenueActions.tsx` (brisanje objekta), `CjeniciList.tsx` (brisanje
     cjenika), `ItemsManager.tsx` (brisanje stavke), `DeleteAccountForm.
     tsx` (upozorenje o nepovratnosti prije brisanja računa — korak s
     lozinkom OSTAJE nepromijenjen, modal je samo dodatni vizualni sloj
     oko postojeće potvrde), `ImportReview.tsx` (zamjena postojećih
     stavki pri uvozu).
  `npm run typecheck` i `npm run build` prolaze čisto. **Test — DB-level
  za upozorenje o zastarjelosti (gore), za sve ostalo NIJE testirano
  uživo** (izvan dosega — sandbox nema odlazni pristup do
  sidroapp.com/Supabase pa live browser test nije moguć odavde): prazno
  stanje, dinamična CTA labela, breadcrumb navigacija, in-app modal
  ponašanje (uključujući da modal ne blokira ostatak stranice/React
  state kao native `confirm()`) čekaju korisnikovu live provjeru.
- **Dio 4 foolproof brief: dijakritici/duge nazive u generiranom sadržaju,
  prazan/neprepoznat upload** — testni zadatak (#4 iz istog briefa,
  double-submit zaštita, već odrađen u Dio 3 rundi). Metodologija ista kao
  Dio 2: sintetički test podaci + izravno pokretanje STVARNIH funkcija iz
  repozitorija preko `npx tsx` (server-only stub privremeno, vraćen odmah
  nakon, node_modules diff potvrđen prazan). **Rezultat: 0 pravih bugova
  — sve granične vrijednosti već su obrađene u postojećem kodu.**
  - **#1/#2 dijakritici i duge nazive u generatoru** (`lib/generate/
    files.ts`) — 9/9 testova prošlo: hrvatski dijakritici (č ć š đ ž)
    nepromijenjeni kroz CSV i XML round-trip (parsirano natrag i
    uspoređeno bajt-za-bajt), naziv od točno 300 znakova (DB/Zod max)
    nepromijenjen u oba formata, CSV escaping ispravan za navodnike/
    točka-zarez/newline unutar polja, XML escaping ispravan za sva
    5 specijalnih znakova (`& < > " '`), 5 stavki s različitim
    dijakriticima zadržavaju točan redoslijed. Naziv se namjerno NE
    transliterira u sadržaju (za razliku od naziva DATOTEKE u
    `filename.ts`) — zakonski tekst mora ostati izvoran.
  - **#2 duge nazive na ulazu** — provjereno (čitanjem + potvrđeno testom
    iznad da 300-znakovni naziv preživi generator) da SVA tri mjesta gdje
    naziv stavke ulazi u sustav već rade `.slice(0, 300)` odn.
    `zod .max(300)`: `lib/parsers/heuristics.ts:177` (PDF/DOCX/OCR/tekst/
    URL uvoz), `lib/parsers/structured.ts:46` (CSV/XLSX/XML uvoz),
    `lib/itemSchema.ts` i `items/batch` ruta (ručni unos) — dosljedno,
    nema puta kojim bi predugačak naziv mogao proći `zod` validaciju na
    spremanju i srušiti cijeli batch.
  - **#3 prazan/neprepoznat upload, svi tipovi** — 20/20 testova prošlo
    preko `lib/parsers/structured.ts`, `lib/parsers/documents.ts` i
    `lib/security/fileValidation.ts` izravno: prazan/garbage CSV i XML
    (uključ. malformed XML) vraćaju `[]` bez bacanja iznimke (Papa/
    fast-xml-parser su namjerno lenientni); prazan/garbage XLSX BEZ zip
    potpisa isto vraća `[]` bez bacanja (SheetJS pada natrag na plain-text
    parsing umjesto bacanja — bezopasno jer `rowToItem` svejedno odbaci
    retke bez naziv+cijena stupaca) — ali STVARNO oštećen/odsječen XLSX
    SA ispravnim ZIP magic bytes (realističan slučaj prekinutog uploada)
    ispravno baca iznimku koju `upload/route.ts` hvata i vraća 422; prazan/
    garbage PDF i DOCX oboje bacaju iznimku, uhvaćeno. `detectSourceType`
    (`lib/security/fileValidation.ts`) potvrđen kao prva linija obrane:
    prazan `.pdf`/`.xlsx` → `null` (nema magic bytes, nisu na fallback
    whitelisti), prazan `.csv` → `"csv"` (fallback po ekstenziji, ispravno
    jer prazan sadržaj nije "binaran"), plain-text preimenovan u `.xlsx`
    → `null` (magic bytes ne odgovaraju ekstenziji), binarni sadržaj s
    null-bajtovima nazvan `.csv` → `null` (`looksBinary` provjera sprječava
    lažni CSV). Asimetrija PDF-a naspram DOCX/XLSX (garbage PDF završava
    kao tiho "0 stavki" umjesto eksplicitnog 422) je NAMJERNO ponašanje,
    ne bug — postojeći OCR fallback princip iz Dio 2 runde ("uvijek pokušaj
    OCR prije nego odustaneš") isto tako guta grešku standardne
    ekstrakcije; korisnik svejedno vidi jasno "0 stavki" stanje s izlazom
    (popravljeno u Dio 2 dead-end bugu).
  `npm run typecheck` i `npm run build` prolaze čisto (bez promjena koda
  ove runde — testiranje je potvrdilo postojeću implementaciju, nije
  zahtijevalo popravak). Test skripte i node_modules/server-only stub
  potpuno uklonjeni nakon, `git status` čist.
- **"Koraci do objave" — vidljiv checklist napretka** (`components/
  PublishChecklist.tsx`, novi; ožičen u `app/dashboard/[venue]/page.tsx`)
  — umjesto posrednog zaključivanja gdje je korisnik u procesu (iz toga
  koji su gumbi vidljivi/skriveni, uvedeno u prethodnoj rundi), eksplicitan
  panel sa svih 5 koraka, status svakog izveden IZRAVNO iz podataka već
  dohvaćenih na stranici (server komponenta, bez vlastitog klijentskog
  statea):
  1. Objekt kreiran (uvijek gotovo na ovoj stranici)
  2/3. Cjenik kreiran / Stavke dodane — `cjenikCount > 0` / `itemCount > 0`
  4. Cjenik generiran — NIJE samo "postoji bilo koja generirana datoteka":
     zahtijeva da SVAKA zakonska kategorija koja ima barem jednu stavku
     ima i svoju trenutnu, ne-zastarjelu generiranu datoteku (ponovno
     koristi `staleTips` izračun iz upozorenja o zastarjelosti uvedenog u
     prethodnoj rundi — ista logika, ne duplicirana).
  5. Cjenik objavljen — `venue.status === "published"`.
  Svaki nedovršen korak je klik: koraci 2/3 vode na `/cjenik` stranicu
  (`next/link`), koraci 4/5 skroluju na `#cjenik-actions` (obična `<a>`
  sidra na id dodan na sekciju s `VenueActions`-om, ne triggeriraju samu
  akciju izravno s checklist klika — namjerno, da se izbjegne slučajno
  pokretanje generiranja/objave bez da korisnik vidi i svjesno klikne
  stvaran gumb za tu nepovratnu/vidljivu akciju). Kad su svi koraci
  gotovi, panel se sklapa u jednu liniju "Sve objavljeno ✓"; budući da je
  cijela logika izvedena iz svježih podataka sa servera na svakom
  učitavanju/`router.refresh()`-u (koji `VenueActions` već zove nakon
  generate/publish/delete), panel se AUTOMATSKI ponovno raširi čim neki
  korak prestane biti ispunjen — bez potrebe za posebnim "zapamti da je
  bilo sklopljeno" stateom kojeg bi trebalo posebno resetirati.
  **Test — DB-level** (Supabase MCP, sintetički venue): potvrđeno da korak
  4 ispravno prijavljuje NEPOTPUNO kad jedna od dvije kategorije sa
  stavkama nema svoju generiranu datoteku (`tips_with_items_count=2,
  tips_generated_count=1` → `false`), i POTPUNO kad obje imaju
  (`tips_generated_count=2` → `true`); test podaci obrisani nakon.
  `npm run typecheck` i `npm run build` prolaze čisto. **Nije testirano
  uživo**: stvaran klik-kroz sva tri scenarija iz zadatka (nov objekt →
  prvi korak klikabilan; nakon pune objave → sklopljeno; izmjena stavke
  nakon objave bez re-generiranja → ponovno rašireno) — logika je
  ručno simulirana kroz kod i potvrđena DB-level testom za korak 4, ali
  stvaran klik u pregledniku čeka korisnikovu provjeru.
- **Prijavljeni bug "brisanje cjenika ne briše stavke" — istraženo,
  hipoteza NIJE potvrđena, pravi problem nađen i popravljen negdje
  drugdje.** Korisnik je prijavio da FK na `items.cjenik_id` koristi
  `set null` umjesto `cascade`, na temelju checklist prikaza na objektu
  "test" nakon brisanja "Glavni cjenik". Prije bilo kakve izmjene sheme,
  provjereno izravno na produkcijskoj bazi (`pg_constraint` upit, ne
  čitanje migracijske datoteke — moguć je razmak između onoga što je
  zapisano i onoga što je STVARNO primijenjeno):
  ```
  items_cjenik_id_fkey: FOREIGN KEY (cjenik_id) REFERENCES cjenici(id) ON DELETE CASCADE
  ```
  FK je već `CASCADE`, potvrđeno i regresijskim testom ispod. Predložena
  migracija iz zadatka (`drop constraint` + `add constraint ... cascade`)
  NIJE primijenjena — bila bi no-op na već ispravnom constraintu, bez
  ikakve koristi, samo nepotreban rizik na produkcijskoj tablici.

  **Stvarni uzrok 70 "osirotjelih" stavki na objektu "test"**, rekonstruiran
  iz `audit_log` te `items.created_at`/`updated_at` te git povijesti
  migracija: sve 70 stavki dijele TOČNO isti `created_at` = `2026-09-24
  18:25:31`. Cjenici funkcionalnost (migracija `0011_cjenici.sql`,
  `items.cjenik_id` stupac) uvedena je commitom `01a52ad`, deployan tek u
  **19:00:30** istog dana — više od 30 minuta KASNIJE. Te stavke su,
  drugim riječima, nastale prije nego što je `cjenik_id` stupac uopće
  postojao; migracija ih je retroaktivno dobila kao `null` (točno
  namjeravano ponašanje iz vlastitog komentara migracije: "Postojeće
  stavke (cjenik_id null) ostaju netaknute i dalje uključene u izvoz").
  Sam `cjenik_delete` audit zapis za "Glavni cjenik" to potvrđuje vlastitim
  tekstom: `"Glavni cjenik" — 0 stavki obrisano` — taj cjenik STVARNO nije
  imao nijednu vezanu stavku (kreiran 19:31, sat vremena nakon što su
  stavke već postojale bez ikakvog cjenika), pa brisanje nije ni trebalo
  ništa cascade-obrisati. Provjereno da isti obrazac (orphan stavke s
  `created_at` prije 19:00:30 tog dana) vrijedi za sve OSTALE pogođene
  objekte u bazi (`Sesame` — 10 stavki iz 9/23, prije nego je cjenici
  koncept uopće postojao; `test pjerin` — 70 stavki u 19:04:40, unutar
  prozora dok je deploy tek postizao propagaciju) — nijedan trag ne postoji
  koji bi povezao IJEDNU od ovih stavki sa stvarnim cjenik-delete
  operacijom. **Migracija podataka (zadatak #2) stoga NIJE pokrenuta —
  ove stavke su legitimne, po istom kriteriju koji je korisnik sam
  postavio ("nastala prije uvođenja cjenici koncepta → ostaviti").**

  **Pravi, stvaran propust — otkriven kroz istu istragu**: iako FK
  ispravno cascade-briše stavke VEZANE uz obrisan cjenik, stavke BEZ
  cjenika (bilo naslijeđene kao gore, bilo iz bilo kojeg drugog razloga)
  postaju potpuno nevidljive i needitabilne čim broj cjenika padne na 0 —
  `CjenikWorkspace.tsx` je prikazivao ISKLJUČIVO formu "kreiraj prvi
  cjenik" kad god `cjenici.length === 0`, bez obzira postoje li već
  stavke bez cjenika. Te stavke i dalje ulaze u `generate` rutu (agregira
  po `venue_id`, ne po `cjenik_id`) i u već objavljeni javni cjenik —
  korisnik nije imao NAČINA ih vidjeti, urediti ili obrisati kroz UI. Ovo
  je stvaran rizik za točnost zakonski objavljenog sadržaja, samo
  drugačijeg mehanizma od prijavljenog. Popravljeno: `CjenikWorkspace.tsx`
  sad prikazuje samo formu za kreiranje prvog cjenika kad NEMA ni cjenika
  ni stavki (`cjenici.length === 0 && ungroupedCount === 0`); čim postoji
  ijedna stavka bez cjenika, ispod forme se prikazuje puni `ImportPanel`/
  `ItemsManager` s `cjenikId=null`, isti obrazac koji se već koristio za
  postojeći odabir "Bez cjenika — starije stavke" u dropdownu. Naslov
  sekcije mijenja se u "Stavke bez cjenika" kad nema odabranog cjenika,
  radi jasnoće.
  - **Regresijski test (zadatak #3) — DB-level**, Supabase MCP, sintetički
    venue: kreiran cjenik s 2 stavke (proizvod + usluga) i generiranim
    datotekama, izbrisan `DELETE FROM cjenici WHERE id=...` (točna akcija
    iz `app/api/cjenici/[cjenik]/route.ts`) — potvrđeno da NAKON brisanja
    više NEMA nijedne stavke tog `cjenik_id`-a (obrisane, ne `null`), da
    ukupan broj stavki objekta pada na 0 (znači: iduće `generate`
    agregiranje po `venue_id` neće ih uključiti), i da nema novih
    osirotjelih redaka. Test podaci obrisani nakon.
  - `npm run typecheck` i `npm run build` prolaze čisto.
  - **Nije testirano uživo**: stvaran prikaz "Stavke bez cjenika" panela
    na objektu "test" u pregledniku (70 postojećih stavki sad bi trebale
    postati vidljive/uredive) čeka korisnikovu provjeru. Podaci na tom
    objektu namjerno NISU dirani — samo UI koji ih prikazuje.
