import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politika privatnosti — sidro",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-16">
      <article className="max-w-2xl mx-auto prose-legal">
        <Link href="/" className="text-sm text-slate underline mb-8 inline-block">
          ← Natrag na sidro
        </Link>

        <h1 className="text-2xl font-bold mb-1">Sidro — Politika privatnosti</h1>
        <p className="text-sm opacity-70 mb-10">Datum stupanja na snagu: 22. rujna 2026.</p>

        <Section title="1. Opće informacije">
          <P>
            Ova Politika privatnosti objašnjava kako društvo <strong>MERIDIAN 18 d.o.o.</strong>,
            Gorica svetoga Vlaha 22, 20000 Dubrovnik, Republika Hrvatska, OIB: 48713727804, MBS:
            090052258 („Meridian 18”, „mi”, „nas”), obrađuje osobne podatke u vezi s digitalnom
            uslugom <strong>SIDRO</strong> („SIDRO” ili „Usluga”).
          </P>
          <P>
            Meridian 18 je voditelj obrade osobnih podataka u odnosu na obrade za koje samostalno
            određuje svrhe i sredstva obrade.
          </P>
          <P>
            Ova Politika privatnosti primjenjuje se na obradu osobnih podataka povezanu s
            korištenjem SIDRO-a, uključujući podatke koje korisnici izravno dostavljaju, podatke
            sadržane u učitanim dokumentima te tehničke podatke nastale korištenjem Usluge.
          </P>
        </Section>

        <Section title="2. Koje podatke obrađujemo">
          <P>Ovisno o načinu korištenja SIDRO-a, možemo obrađivati sljedeće kategorije podataka.</P>

          <h3 className="font-bold mt-6 mb-2">2.1. Podaci korisnika</h3>
          <P>Ako SIDRO zahtijeva korisnički račun, možemo obrađivati:</P>
          <Ul
            items={[
              "ime i prezime",
              "naziv poslovnog subjekta",
              "e-mail adresu",
              "broj telefona, ako ga korisnik dostavi",
              "adresu",
              "podatke potrebne za autentifikaciju",
              "podatke o korisničkom računu",
            ]}
          />

          <h3 className="font-bold mt-6 mb-2">2.2. Podaci sadržani u učitanim dokumentima</h3>
          <P>
            Korisnik može učitati PDF, TXT, DOC, DOCX, XLS, XLSX, CSV, slike i druge podržane
            datoteke.
          </P>
          <P>Takvi dokumenti mogu sadržavati osobne podatke, primjerice:</P>
          <Ul
            items={[
              "ime i prezime",
              "poslovne kontakt podatke",
              "telefonske brojeve",
              "e-mail adrese",
              "adrese",
              "potpise",
              "druge podatke koje korisnik uključi u dokument",
            ]}
          />
          <P>
            Meridian 18 takve podatke obrađuje u mjeri potrebnoj za pružanje SIDRO usluge.
          </P>
          <P>
            Korisnik je odgovoran osigurati da za osobne podatke koje dostavlja putem SIDRO-a
            postoji odgovarajuća pravna osnova za njihovu obradu i, kada je primjenjivo, javnu
            objavu.
          </P>

          <h3 className="font-bold mt-6 mb-2">2.3. Generirani podaci</h3>
          <P>Možemo obrađivati:</P>
          <Ul
            items={[
              "strukturirane podatke cjenika",
              "nazive proizvoda i usluga",
              "cijene",
              "jedinice mjere",
              "kategorije",
              "posebne oblike prodaje",
              "sidrene cijene",
              "XML datoteke",
              "CSV datoteke",
              "identifikatore cjenika",
              "javne URL adrese",
              "podatke povezane s QR kodovima",
              "datume i vrijeme stvaranja ili izmjene cjenika",
            ]}
          />

          <h3 className="font-bold mt-6 mb-2">2.4. Tehnički podaci</h3>
          <P>
            Možemo obrađivati tehničke podatke potrebne za funkcioniranje i sigurnost sustava,
            uključujući:
          </P>
          <Ul
            items={[
              "IP adresu",
              "datum i vrijeme pristupa",
              "vrstu uređaja",
              "operativni sustav",
              "vrstu preglednika",
              "tehničke logove",
              "podatke o pogreškama",
              "podatke o sigurnosnim događajima",
              "podatke potrebne za sprječavanje zlouporabe",
            ]}
          />
        </Section>

        <Section title="3. Svrhe obrade i pravne osnove">
          <h3 className="font-bold mt-2 mb-2">3.1. Pružanje SIDRO usluge</h3>
          <P>Podatke obrađujemo kako bismo mogli:</P>
          <Ul
            items={[
              "zaprimiti korisničke datoteke",
              "obraditi i strukturirati njihov sadržaj",
              "generirati cjenik",
              "generirati XML/CSV datoteke",
              "pohraniti cjenik",
              "generirati javnu URL adresu",
              "generirati QR kod",
              "omogućiti javni pristup generiranom cjeniku",
              "pružiti tehničku podršku",
            ]}
          />
          <P>
            Pravna osnova za ovu obradu je, prema okolnostima konkretnog slučaja,{" "}
            <strong>izvršavanje ugovora</strong> ili poduzimanje radnji na zahtjev korisnika prije
            sklapanja ugovora, u skladu s člankom 6. stavkom 1. točkom (b) GDPR-a.
          </P>

          <h3 className="font-bold mt-6 mb-2">3.2. Sigurnost i održavanje sustava</h3>
          <P>Podatke obrađujemo radi:</P>
          <Ul
            items={[
              "zaštite sustava",
              "otkrivanja i sprječavanja zlouporabe",
              "sprečavanja neovlaštenog pristupa",
              "otklanjanja tehničkih problema",
              "održavanja infrastrukture",
              "izrade i upravljanja sigurnosnim kopijama",
            ]}
          />
          <P>
            Pravna osnova za ovu obradu je <strong>legitimni interes</strong> Meridian 18 za
            sigurnost i zaštitu svojih informacijskih sustava, u skladu s člankom 6. stavkom 1.
            točkom (f) GDPR-a.
          </P>

          <h3 className="font-bold mt-6 mb-2">3.3. Ispunjavanje zakonskih obveza</h3>
          <P>
            Podatke možemo obrađivati kada je to potrebno radi ispunjavanja zakonskih obveza
            Meridian 18.
          </P>
          <P>Pravna osnova je članak 6. stavak 1. točka (c) GDPR-a.</P>

          <h3 className="font-bold mt-6 mb-2">3.4. Zaštita pravnih zahtjeva</h3>
          <P>
            Podatke možemo obrađivati kada je to potrebno za uspostavljanje, ostvarivanje ili
            obranu pravnih zahtjeva.
          </P>
          <P>
            Pravna osnova može biti legitimni interes Meridian 18 ili druga primjenjiva pravna
            osnova, ovisno o okolnostima.
          </P>
        </Section>

        <Section title="4. Javno dostupni cjenici">
          <P>Jedna od funkcionalnosti SIDRO-a je omogućavanje stvaranja javno dostupnog cjenika.</P>
          <P>
            Kada korisnik generira javni cjenik, podaci koje je uključio u cjenik mogu biti
            dostupni trećim osobama putem javne URL adrese i QR koda.
          </P>
          <P>Javno dostupni podaci mogu uključivati:</P>
          <Ul
            items={[
              "naziv poslovnog subjekta",
              "naziv proizvoda ili usluge",
              "cijenu",
              "jedinicu mjere",
              "druge podatke koje korisnik uključi u cjenik",
            ]}
          />
          <P>Korisnik je odgovoran za sadržaj koji objavljuje.</P>
          <P>
            Meridian 18 preporučuje da korisnik prije objave provjeri da javni cjenik ne sadrži
            nepotrebne osobne podatke, povjerljive informacije ili druge podatke koji nisu
            namijenjeni javnosti.
          </P>
        </Section>

        <Section title="5. Pohrana podataka i rokovi čuvanja">
          <P>
            Meridian 18 pohranjuje podatke u opsegu potrebnom za pružanje SIDRO-a, sigurnost
            sustava, izvršavanje ugovornih i zakonskih obveza te zaštitu svojih pravnih interesa.
          </P>

          <h3 className="font-bold mt-6 mb-2">Aktivni cjenici</h3>
          <P>
            Aktivni cjenici i povezani podaci čuvaju se dok su potrebni za pružanje Usluge, dok ih
            korisnik ne izbriše ili dok ne istekne svrha njihova čuvanja, osim ako postoji
            zakonska ili druga opravdana osnova za dulje čuvanje.
          </P>

          <h3 className="font-bold mt-6 mb-2">Zakonske obveze</h3>
          <P>
            Podaci koji se moraju čuvati temeljem zakona čuvaju se tijekom razdoblja propisanog
            odgovarajućim propisom.
          </P>

          <h3 className="font-bold mt-6 mb-2">Sigurnosne kopije</h3>
          <P>
            Podaci mogu ostati u sigurnosnim kopijama nakon brisanja iz aktivnog sustava. Takve
            kopije čuvaju se ograničeno vrijeme prema tehničkom ciklusu sigurnosnog kopiranja i
            nakon toga se brišu ili prepisuju.
          </P>
        </Section>

        <Section title="6. Primatelji i izvršitelji obrade">
          <P>Za pružanje SIDRO-a Meridian 18 može koristiti specijalizirane pružatelje:</P>
          <Ul
            items={[
              "cloud infrastrukture",
              "hostinga",
              "pohrane podataka",
              "baza podataka",
              "sigurnosnih usluga",
              "tehničkog održavanja",
              "analitike",
              "komunikacijskih usluga",
              "drugih IT usluga potrebnih za rad SIDRO-a",
            ]}
          />
          <P>
            Takvi pružatelji mogu obrađivati osobne podatke u ime Meridian 18 i prema njegovim
            dokumentiranim uputama kada imaju svojstvo izvršitelja obrade.
          </P>
          <P>
            Meridian 18 s relevantnim izvršiteljima obrade poduzima odgovarajuće ugovorne,
            tehničke i organizacijske mjere zaštite osobnih podataka.
          </P>
        </Section>

        <Section title="7. Međunarodni prijenosi">
          <P>
            Ovisno o korištenoj tehnološkoj infrastrukturi i pružateljima usluga, osobni podaci
            mogu biti obrađivani izvan Europskog gospodarskog prostora.
          </P>
          <P>
            Ako se osobni podaci prenose u treću zemlju ili međunarodnu organizaciju, Meridian 18
            će primijeniti odgovarajući mehanizam prijenosa predviđen GDPR-om, uključujući, kada je
            primjenjivo, odluku o primjerenosti ili odgovarajuće zaštitne mjere.
          </P>
        </Section>

        <Section title="8. Automatizirana obrada i umjetna inteligencija">
          <P>
            SIDRO može koristiti automatizirane postupke, uključujući OCR, parsiranje, algoritamsku
            obradu i, kada je primjenjivo, tehnologije umjetne inteligencije za ekstrakciju i
            strukturiranje podataka iz učitanih dokumenata.
          </P>
          <P>Svrha takve obrade je omogućiti tehničku konverziju i strukturiranje sadržaja cjenika.</P>
          <P>
            Generirani rezultat može sadržavati pogreške te korisnik mora provjeriti podatke prije
            njihove javne objave ili uporabe.
          </P>
          <P>
            SIDRO ne provodi automatizirano donošenje odluka koje proizvodi pravne učinke na
            korisnika ili na njega na sličan način značajno utječe.
          </P>
        </Section>

        <Section title="9. Sigurnost osobnih podataka">
          <P>
            Meridian 18 primjenjuje odgovarajuće tehničke i organizacijske mjere zaštite osobnih
            podataka, uzimajući u obzir prirodu obrade i rizike za prava i slobode pojedinaca.
          </P>
          <P>Mjere mogu uključivati:</P>
          <Ul
            items={[
              "kontrolu pristupa",
              "autentifikaciju",
              "ograničavanje pristupa podacima",
              "sigurnosne logove",
              "sigurnosne kopije",
              "zaštitu komunikacije",
              "praćenje sigurnosnih događaja",
              "postupke oporavka sustava",
            ]}
          />
        </Section>

        <Section title="10. Prava ispitanika">
          <P>
            U skladu s GDPR-om, ispitanik može, kada su ispunjeni zakonski uvjeti, ostvariti:
          </P>
          <Ul
            items={[
              "pravo na pristup osobnim podacima",
              "pravo na ispravak netočnih ili nepotpunih podataka",
              "pravo na brisanje osobnih podataka",
              "pravo na ograničenje obrade",
              "pravo na prenosivost podataka",
              "pravo na prigovor na obradu koja se temelji na legitimnom interesu",
              "pravo na povlačenje privole kada se obrada temelji na privoli",
            ]}
          />
          <P>Za ostvarivanje svojih prava ispitanik može kontaktirati Meridian 18 putem adrese:</P>
          <P>
            <a href="mailto:info@meridian18.hr" className="text-slate underline">
              info@meridian18.hr
            </a>
          </P>
          <P>
            Meridian 18 može zatražiti dodatne informacije potrebne za potvrdu identiteta
            podnositelja zahtjeva kada je to potrebno radi zaštite osobnih podataka.
          </P>
        </Section>

        <Section title="11. Pravo na pritužbu nadzornom tijelu">
          <P>
            Ispitanik ima pravo podnijeti pritužbu nadležnom nadzornom tijelu ako smatra da je
            obrada njegovih osobnih podataka protivna GDPR-u ili drugim primjenjivim propisima.
          </P>
          <P>Nadzorno tijelo u Republici Hrvatskoj je:</P>
          <P className="mb-0">
            <strong>Agencija za zaštitu osobnih podataka (AZOP)</strong>
            <br />
            Ulica Metela Ožegovića 16
            <br />
            10000 Zagreb
            <br />
            Republika Hrvatska
          </P>
          <P>
            E-mail:{" "}
            <a href="mailto:azop@azop.hr" className="text-slate underline">
              azop@azop.hr
            </a>
          </P>
          <P>
            Telefon:{" "}
            <a href="tel:+38514609000" className="text-slate underline">
              +385 (0)1 4609-000
            </a>
          </P>
        </Section>

        <Section title="12. Kolačići i slične tehnologije">
          <P>SIDRO može koristiti kolačiće i slične tehnologije potrebne za:</P>
          <Ul
            items={[
              "funkcioniranje web stranice",
              "autentifikaciju",
              "održavanje korisničke sesije",
              "sigurnost",
              "osnovnu analitiku",
              "poboljšanje korisničkog iskustva",
            ]}
          />
          <P>
            Za kolačiće i slične tehnologije za koje je prema primjenjivim propisima potrebna
            privola, korisniku će biti omogućeno upravljanje privolama prije postavljanja takvih
            tehnologija.
          </P>
          <P>Detalji o korištenim kolačićima mogu biti navedeni u zasebnoj Politici kolačića.</P>
        </Section>

        <Section title="13. Podaci djece">
          <P>
            SIDRO nije namijenjen djeci i nije namijenjen stvaranju korisničkih računa za osobe
            mlađe od dobi dopuštene primjenjivim propisima.
          </P>
          <P>
            Meridian 18 ne prikuplja svjesno osobne podatke djece u svrhu stvaranja korisničkih
            računa.
          </P>
        </Section>

        <Section title="14. Izmjene Politike privatnosti">
          <P>
            Meridian 18 može povremeno izmijeniti ovu Politiku privatnosti zbog promjena SIDRO-a,
            tehnologije, načina obrade ili primjenjivih propisa.
          </P>
          <P>Ažurirana verzija bit će objavljena na SIDRO web stranici.</P>
          <P>Datum posljednje izmjene naveden je na početku dokumenta.</P>
          <P>Ako je izmjena značajna, Meridian 18 može korisnike o njoj obavijestiti na odgovarajući način.</P>
        </Section>

        <Section title="15. Kontakt">
          <P>
            Za pitanja o obradi osobnih podataka, ostvarivanje prava ispitanika ili pitanja
            povezana s ovom Politikom privatnosti možete kontaktirati:
          </P>
          <P className="mb-0">
            <strong>MERIDIAN 18 d.o.o.</strong>
            <br />
            Gorica svetoga Vlaha 22
            <br />
            20000 Dubrovnik
            <br />
            Republika Hrvatska
          </P>
          <P>
            OIB: 48713727804
            <br />
            MBS: 090052258
          </P>
          <P>
            E-mail:{" "}
            <a href="mailto:info@meridian18.hr" className="text-slate underline">
              info@meridian18.hr
            </a>
          </P>
        </Section>

        <p className="text-sm opacity-70 mt-10">Posljednje ažuriranje: 22. rujna 2026.</p>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function P({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm leading-relaxed mb-3 ${className}`}>{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 text-sm leading-relaxed mb-3 flex flex-col gap-1">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
