-- Sidrova vlastita poslovna kategorizacija objekata (kategorija/podkategorija).
-- Ovo je INTERNA organizacijska taksonomija radi pretraživog birača na formi
-- "Stvori objekt" — NIJE tvrdnja o službenom zakonskom šifrarniku (npr. NKD
-- ili razredba iz Zakona o ugostiteljskoj djelatnosti). venues.oblik_objekta
-- (slobodni tekst, koristi se za generiranje naziva datoteke —
-- lib/generate/filename.ts, nepromijenjeno) ostaje netaknut kao stupac;
-- kod odabira podkategorije na formi se samo automatski popuni njezinim
-- nazivom umjesto slobodnog upisa.

create table venue_kategorije (
  id uuid primary key default gen_random_uuid(),
  naziv text not null,
  redoslijed integer not null default 0
);

create table venue_podkategorije (
  id uuid primary key default gen_random_uuid(),
  kategorija_id uuid not null references venue_kategorije (id) on delete cascade,
  naziv text not null,
  redoslijed integer not null default 0
);

create index venue_podkategorije_kategorija_id_idx on venue_podkategorije (kategorija_id);

-- Nullable, bez defaulta — opt-in samo za objekte kreirane od sad nadalje.
-- Postojeći objekti zadržavaju svoj oblik_objekta tekst kakav jest,
-- podkategorija_id im ostaje null (ne pokušava se retroaktivno pogoditi
-- kojoj bi kategoriji odgovarali).
alter table venues
  add column podkategorija_id uuid references venue_podkategorije (id);

alter table venue_kategorije enable row level security;
alter table venue_podkategorije enable row level security;

-- Statička referentna taksonomija, ništa osjetljivo — čitljivo svima
-- (potrebno na formi "Stvori objekt" prije nego korisnik uopće ima venue).
create policy venue_kategorije_select on venue_kategorije
  for select using (true);

create policy venue_podkategorije_select on venue_podkategorije
  for select using (true);

-- ---------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------

insert into venue_kategorije (naziv, redoslijed) values
  ('Ugostiteljski objekt', 1),
  ('Turističke usluge', 2),
  ('Sport i rekreacija', 3),
  ('Osobne usluge', 4),
  ('Prijevoz', 5),
  ('Kultura i zabava', 6),
  ('Trgovina / Maloprodaja', 7),
  ('Ostale usluge', 8);

insert into venue_podkategorije (kategorija_id, naziv, redoslijed)
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
join venue_kategorije k on k.naziv = v.kategorija_naziv;
