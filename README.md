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
