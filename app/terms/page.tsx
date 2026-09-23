import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uvjeti korištenja — sidro",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-16">
      <article className="max-w-2xl mx-auto prose-legal">
        <Link href="/" className="text-sm text-slate underline mb-8 inline-block">
          ← Natrag na sidro
        </Link>

        <h1 className="text-2xl font-bold mb-1">Sidro — Uvjeti korištenja</h1>
        <p className="text-sm opacity-70 mb-10">Datum stupanja na snagu: 22. rujna 2026.</p>

        <Section title="1. Opće odredbe">
          <P>
            Ovi Uvjeti korištenja („Uvjeti”) uređuju korištenje digitalne usluge{" "}
            <strong>SIDRO</strong> („SIDRO” ili „Usluga”), kojom upravlja društvo{" "}
            <strong>MERIDIAN 18 d.o.o.</strong>, Gorica svetoga Vlaha 22, 20000 Dubrovnik,
            Republika Hrvatska, OIB: 48713727804, MBS: 090052258 („Meridian 18”, „mi”, „nas” ili
            „Pružatelj usluge”).
          </P>
          <P>
            SIDRO je digitalni alat namijenjen učitavanju, obradi, strukturiranju, pretvaranju,
            pohrani i objavi cjenika proizvoda i usluga u digitalnim i strojno čitljivim
            formatima, uključujući XML i CSV.
          </P>
          <P>Korištenjem SIDRO-a korisnik potvrđuje da je pročitao, razumio i prihvatio ove Uvjete.</P>
          <P>Ako korisnik ne prihvaća ove Uvjete, ne smije koristiti SIDRO.</P>
        </Section>

        <Section title="2. Opis Usluge">
          <P>SIDRO može omogućavati:</P>
          <Ul
            items={[
              "učitavanje cjenika i drugih datoteka",
              "obradu PDF, TXT, DOC, DOCX, XLS, XLSX, CSV, slikovnih i drugih podržanih formata",
              "ekstrakciju teksta i podataka",
              "automatsko parsiranje i strukturiranje podataka",
              "prepoznavanje naziva proizvoda i usluga, cijena, jedinica mjere, kategorija i drugih podataka",
              "ručnu provjeru i uređivanje strukturiranih podataka",
              "generiranje XML i/ili CSV datoteka",
              "generiranje javne web stranice cjenika",
              "generiranje jedinstvene URL adrese cjenika",
              "generiranje QR koda koji vodi na javno dostupni cjenik",
              "pohranu izvornog i generiranog sadržaja",
              "omogućavanje tehničkog pristupa podacima putem URL-a ili drugih dostupnih tehničkih rješenja",
            ]}
          />
          <P>Meridian 18 može povremeno dodavati, mijenjati ili uklanjati pojedine funkcionalnosti SIDRO-a.</P>
        </Section>

        <Section title="3. Korisnički sadržaj">
          <P>
            „Korisnički sadržaj” znači sve datoteke, dokumente, tekstove, cjenike, fotografije,
            podatke i druge materijale koje korisnik učita, unese, generira ili pohrani putem
            SIDRO-a.
          </P>
          <P>Korisnik zadržava sva prava na svom korisničkom sadržaju.</P>
          <P>
            Korištenjem SIDRO-a korisnik daje Meridianu 18 ograničeno, neisključivo pravo
            korištenja korisničkog sadržaja u opsegu potrebnom za:
          </P>
          <Ul
            items={[
              "pružanje Usluge",
              "obradu i strukturiranje podataka",
              "konverziju podataka",
              "generiranje XML/CSV i drugih izlaznih formata",
              "pohranu podataka",
              "generiranje i održavanje javnog cjenika",
              "generiranje i funkcioniranje QR koda",
              "pružanje tehničke podrške",
              "sigurnost i održavanje sustava",
              "izvršavanje zakonskih obveza",
            ]}
          />
          <P>Meridian 18 ne stječe vlasništvo nad korisničkim sadržajem.</P>
        </Section>

        <Section title="4. Odgovornost korisnika za sadržaj">
          <P>Korisnik je odgovoran za sadržaj koji učitava, uređuje i objavljuje putem SIDRO-a.</P>
          <P>Korisnik potvrđuje da:</P>
          <Ul
            items={[
              "ima pravo koristiti i obrađivati sadržaj koji učitava",
              "ima pravo dati Meridianu 18 potrebna prava za obradu tog sadržaja",
              "sadržaj koji objavljuje nije nezakonit",
              "objavom sadržaja ne krši prava trećih osoba",
              "za osobne podatke sadržane u učitanim dokumentima ima odgovarajuću pravnu osnovu za njihovu obradu",
              "prije javne objave provjerava da cjenik ne sadrži nepotrebne osobne ili povjerljive podatke",
              "podaci o proizvodima, uslugama i cijenama odgovaraju njegovom stvarnom poslovanju",
              "pravodobno ažurira objavljeni cjenik",
              "provjerava točnost generiranog cjenika prije njegove uporabe ili objave",
            ]}
          />
        </Section>

        <Section title="5. Automatizirana obrada i točnost rezultata">
          <P>
            SIDRO može koristiti automatizirane metode ekstrakcije teksta, OCR-a, parsiranja,
            strukturiranja i druge algoritamske postupke.
          </P>
          <P>Automatizirana obrada može sadržavati pogreške, uključujući pogrešno prepoznate:</P>
          <Ul
            items={[
              "nazive",
              "cijene",
              "jedinice mjere",
              "kategorije",
              "posebne oblike prodaje",
              "sidrene cijene",
              "druge podatke",
            ]}
          />
          <P>SIDRO ne jamči da će automatizirano generirani cjenik u svakom slučaju biti potpuno točan.</P>
          <P>
            Korisnik je dužan pregledati i provjeriti generirani cjenik prije njegove objave,
            distribucije ili korištenja u poslovanju.
          </P>
          <P>
            Meridian 18 ne odgovara za posljedice nastale zbog podataka koje je sustav pogrešno
            obradio ako korisnik nije izvršio odgovarajuću provjeru prije objave ili korištenja.
          </P>
        </Section>

        <Section title="6. SIDRO nije pravno ili regulatorno savjetovanje">
          <P>SIDRO je tehnički alat.</P>
          <P>Korištenje SIDRO-a ne predstavlja pravni, porezni, računovodstveni ili drugi stručni savjet.</P>
          <P>
            Generiranje XML, CSV ili drugog formata putem SIDRO-a ne predstavlja potvrdu da je
            korisnik usklađen sa svim primjenjivim zakonima, propisima ili regulatornim
            zahtjevima.
          </P>
          <P>
            Korisnik je odgovoran za utvrđivanje svojih zakonskih i regulatornih obveza te za
            provjeru odgovara li njegov cjenik primjenjivim propisima.
          </P>
        </Section>

        <Section title="7. Javni cjenik, URL i QR kod">
          <P>
            Kada korisnik generira javni cjenik putem SIDRO-a, SIDRO može stvoriti jedinstvenu URL
            adresu na kojoj je cjenik dostupan javnosti.
          </P>
          <P>SIDRO može generirati QR kod koji omogućuje pristup toj URL adresi.</P>
          <P>Korisnik prihvaća da:</P>
          <Ul
            items={[
              "javni cjenik može biti dostupan trećim osobama",
              "svatko tko posjeduje odgovarajuću URL adresu ili QR kod može pristupiti javno dostupnom cjeniku",
              "Meridian 18 ne može kontrolirati kome će korisnik distribuirati QR kod",
              "korisnik ne smije u javni cjenik uključivati povjerljive ili nepotrebne osobne podatke",
            ]}
          />
          <P>QR kod nije autentifikacijski mehanizam niti predstavlja povjerljiv način pristupa podacima.</P>
        </Section>

        <Section title="8. Pohrana cjenika">
          <P>Radi pružanja Usluge Meridian 18 može pohranjivati:</P>
          <Ul
            items={[
              "izvorne datoteke koje je korisnik učitao",
              "strukturirane podatke dobivene obradom",
              "generirane XML/CSV datoteke",
              "javne verzije cjenika",
              "URL adrese",
              "jedinstvene identifikatore cjenika",
              "podatke potrebne za generiranje i funkcioniranje QR kodova",
              "tehničke i sigurnosne zapise",
            ]}
          />
          <P>
            Objavljeni cjenici mogu biti pohranjeni i dostupni tijekom razdoblja potrebnog za
            pružanje Usluge i ispunjavanje primjenjivih zakonskih zahtjeva.
          </P>
        </Section>

        <Section title="9. Brisanje sadržaja">
          <P>
            Korisnik može zatražiti brisanje svog cjenika ili drugih podataka, osim kada Meridian
            18 ima zakonsku ili drugu opravdanu obvezu zadržati određene podatke.
          </P>
          <P>Brisanje aktivnog sadržaja ne mora rezultirati trenutačnim brisanjem svih sigurnosnih kopija.</P>
          <P>
            Podaci mogu privremeno ostati u sigurnosnim kopijama tijekom ograničenog razdoblja
            potrebnog za tehnički oporavak sustava.
          </P>
        </Section>

        <Section title="10. Zabranjeno korištenje">
          <P>Korisnik ne smije koristiti SIDRO za:</P>
          <Ul
            items={[
              "nezakonite aktivnosti",
              "prijenos sadržaja kojim se krše prava trećih osoba",
              "učitavanje zlonamjernog softvera",
              "pokušaje neovlaštenog pristupa sustavu",
              "ometanje rada SIDRO infrastrukture",
              "namjerno preopterećivanje sustava",
              "zaobilaženje sigurnosnih mehanizama",
              "distribuciju nezakonitog ili štetnog sadržaja",
            ]}
          />
          <P>
            Meridian 18 može privremeno ograničiti ili ukinuti pristup Usluzi ako postoji
            opravdana sumnja na zlouporabu.
          </P>
        </Section>

        <Section title="11. Intelektualno vlasništvo SIDRO-a">
          <P>
            SIDRO, uključujući njegov softver, korisničko sučelje, dizajn, naziv, vizualni
            identitet, izvorni kod, baze podataka, tehnička rješenja i dokumentaciju, pripada
            Meridianu 18 ili njegovim davateljima licenci.
          </P>
          <P>Korisniku se ne prenose prava vlasništva nad tim elementima.</P>
          <P>
            Korisnik ne smije kopirati, distribuirati, prodavati, iznajmljivati, dekompilirati ili
            na drugi način neovlašteno koristiti dijelove SIDRO-a, osim u mjeri dopuštenoj
            primjenjivim propisima.
          </P>
        </Section>

        <Section title="12. Dostupnost Usluge">
          <P>
            Meridian 18 nastoji osigurati kontinuiranu dostupnost SIDRO-a, ali ne jamči da će
            Usluga uvijek biti dostupna bez prekida ili pogrešaka.
          </P>
          <P>Usluga može privremeno biti nedostupna zbog:</P>
          <Ul
            items={[
              "održavanja",
              "nadogradnji",
              "tehničkih problema",
              "problema s infrastrukturom pružatelja trećih strana",
              "sigurnosnih incidenata",
              "okolnosti izvan razumne kontrole Meridian 18",
            ]}
          />
        </Section>

        <Section title="13. Izmjene Usluge">
          <P>Meridian 18 može mijenjati, nadograđivati, ograničiti ili ukinuti pojedine funkcionalnosti SIDRO-a.</P>
          <P>
            Ako se radi o značajnoj promjeni koja bitno utječe na prava korisnika, Meridian 18
            može o tome obavijestiti korisnike na odgovarajući način.
          </P>
        </Section>

        <Section title="14. Ograničenje odgovornosti">
          <P>U najvećoj mjeri dopuštenoj primjenjivim propisima, Meridian 18 ne odgovara za:</P>
          <Ul
            items={[
              "netočnosti u korisničkom sadržaju",
              "pogreške nastale tijekom automatizirane obrade koje korisnik nije provjerio",
              "posljedice korištenja pogrešnog ili nepotpunog cjenika",
              "poslovni gubitak ili gubitak prihoda koji proizlazi iz korištenja ili nemogućnosti korištenja Usluge",
              "odluke korisnika donesene na temelju podataka generiranih putem SIDRO-a",
              "neusklađenost korisnika s propisima",
              "sadržaj koji korisnik javno objavi",
              "nedostupnost Usluge uzrokovanu okolnostima izvan razumne kontrole Meridian 18",
            ]}
          />
          <P>
            Ništa u ovim Uvjetima ne isključuje niti ograničava odgovornost koja se prema
            prisilnim propisima ne može isključiti ili ograničiti.
          </P>
        </Section>

        <Section title="15. Zaštita osobnih podataka">
          <P>
            Obrada osobnih podataka uređena je zasebnom{" "}
            <Link href="/privacy" className="text-slate underline">
              Politikom privatnosti
            </Link>{" "}
            SIDRO-a, koja je dostupna na SIDRO web stranici.
          </P>
        </Section>

        <Section title="16. Mjerodavno pravo">
          <P>Na ove Uvjete primjenjuje se pravo Republike Hrvatske.</P>
          <P>
            Za sporove koji proizlaze iz korištenja SIDRO-a nadležni su stvarno nadležni sudovi
            Republike Hrvatske, uz primjenu obveznih pravila o nadležnosti i zaštiti potrošača
            kada su primjenjiva.
          </P>
        </Section>

        <Section title="17. Kontakt">
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
