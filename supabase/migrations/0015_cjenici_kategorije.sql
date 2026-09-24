-- Ispravak 0014: kategorizacija pripada CJENIKU, ne cijelom objektu (jedan
-- objekt može imati više cjenika različitih kategorija, npr. "Cjenik izleta"
-- pod Turističke usluge i "Restoranski meni" pod Ugostiteljski objekt unutar
-- iste Villa Dubrovnik) — tablice se preimenuju bez venue_ prefiksa
-- (kategorije/podkategorije), FK ide na cjenici, ne na venues.
--
-- venues.oblik_objekta (zakonski naziv datoteke, HOK format,
-- lib/generate/filename.ts) ostaje potpuno odvojen i nepromijenjen — ova
-- kategorizacija u njega nikad ne ulazi.

-- Ukloni pogrešnu venue-razinsku vezu iz 0014 (0 stvarnih objekata ju je
-- ikad koristilo — podkategorija_id je bio null za sve, sigurno za obrisati).
alter table venues drop column podkategorija_id;
drop policy venue_podkategorije_select on venue_podkategorije;
drop policy venue_kategorije_select on venue_kategorije;
drop table venue_podkategorije;
drop table venue_kategorije;

-- Ispravna shema: kategorija/podkategorija na razini cjenika.
create table kategorije (
  id uuid primary key default gen_random_uuid(),
  naziv text not null,
  redoslijed integer not null default 0
);

create table podkategorije (
  id uuid primary key default gen_random_uuid(),
  kategorija_id uuid not null references kategorije (id) on delete cascade,
  naziv text not null,
  redoslijed integer not null default 0
);

create index podkategorije_kategorija_id_idx on podkategorije (kategorija_id);

-- Nullable, bez defaulta — opcionalno polje, opt-in samo za cjenike kreirane
-- od sad nadalje. Postojeći cjenici zadržavaju podkategorija_id = null, ne
-- pokušava se retroaktivno pogoditi kojoj bi kategoriji odgovarali.
alter table cjenici
  add column podkategorija_id uuid references podkategorije (id);

alter table kategorije enable row level security;
alter table podkategorije enable row level security;

-- Statička referentna taksonomija, ništa osjetljivo — čitljivo svima.
create policy kategorije_select on kategorije
  for select using (true);

create policy podkategorije_select on podkategorije
  for select using (true);

-- ---------------------------------------------------------------------
-- Seed (identičan popis kao u 0014, samo u ispravno imenovanim tablicama)
-- ---------------------------------------------------------------------

insert into kategorije (naziv, redoslijed) values
  ('Ugostiteljski objekt', 1),
  ('Turističke usluge', 2),
  ('Sport i rekreacija', 3),
  ('Osobne usluge', 4),
  ('Prijevoz', 5),
  ('Kultura i zabava', 6),
  ('Trgovina / Maloprodaja', 7),
  ('Ostale usluge', 8);

insert into podkategorije (kategorija_id, naziv, redoslijed)
select k.id, v.naziv, v.redoslijed
from (values
  ('Ugostiteljski objekt', 'Restoran', 1),
  ('Ugostiteljski objekt', 'Bar', 2),
  ('Ugostiteljski objekt', 'Catering', 3),
  ('Ugostiteljski objekt', 'Objekt jednostavnih usluga', 4),
  ('Ugostiteljski objekt', 'Hotel', 5),
  ('Ugostiteljski objekt', 'Kamp', 6),
  ('Ugostiteljski objekt', 'Objekt za smještaj', 7),

  ('Turističke usluge', 'Turistička agencija', 1),
  ('Turističke usluge', 'Turistički vodič', 2),
  ('Turističke usluge', 'Organizator izleta/tura', 3),
  ('Turističke usluge', 'Nautičke/turističke usluge', 4),
  ('Turističke usluge', 'Ostale turističke usluge', 5),

  ('Sport i rekreacija', 'Sportski objekt', 1),
  ('Sport i rekreacija', 'Fitness', 2),
  ('Sport i rekreacija', 'Wellness', 3),
  ('Sport i rekreacija', 'Avanturističke aktivnosti', 4),
  ('Sport i rekreacija', 'Sportske/turističke aktivnosti', 5),
  ('Sport i rekreacija', 'Ostalo', 6),

  ('Osobne usluge', 'Frizerski salon', 1),
  ('Osobne usluge', 'Kozmetički salon', 2),
  ('Osobne usluge', 'Salon za uljepšavanje', 3),
  ('Osobne usluge', 'Masaža', 4),
  ('Osobne usluge', 'Ostale osobne usluge', 5),

  ('Prijevoz', 'Taxi', 1),
  ('Prijevoz', 'Rent-a-car', 2),
  ('Prijevoz', 'Charter/brod', 3),
  ('Prijevoz', 'Ostale prijevozne usluge', 4),

  ('Kultura i zabava', 'Muzej', 1),
  ('Kultura i zabava', 'Galerija', 2),
  ('Kultura i zabava', 'Kazalište', 3),
  ('Kultura i zabava', 'Zabavni objekt', 4),
  ('Kultura i zabava', 'Ostalo', 5),

  ('Trgovina / Maloprodaja', 'Trgovina mješovitom robom', 1),
  ('Trgovina / Maloprodaja', 'Specijalizirana trgovina', 2),
  ('Trgovina / Maloprodaja', 'Suvenirnica', 3),
  ('Trgovina / Maloprodaja', 'Ostala maloprodaja', 4),

  ('Ostale usluge', 'Servis/popravak', 1),
  ('Ostale usluge', 'Edukacija', 2),
  ('Ostale usluge', 'Profesionalne usluge', 3),
  ('Ostale usluge', 'Zdravstvene/medicinske usluge', 4),
  ('Ostale usluge', 'Ostalo', 5)
) as v(kategorija_naziv, naziv, redoslijed)
join kategorije k on k.naziv = v.kategorija_naziv;
