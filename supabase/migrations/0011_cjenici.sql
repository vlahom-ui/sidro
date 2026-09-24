-- Kontejner "cjenik" iznad items — organizacijski alat za vlasnika (npr.
-- "Cjenik izleta 2026" vs "Restoranski meni", ili stara/nova verzija istog
-- cjenika kroz vrijeme). NE mijenja zakonski izvoz: generirani .csv/.xml i
-- dalje agregira SVE aktivne proizvod/usluga stavke iz SVIH cjenika objekta
-- u jednu datoteku po tipu — cjenici se ne diraju u generate rutu, schemaOrg
-- ili javnu /c/{slug} stranicu.
create table cjenici (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  naziv text not null,
  created_at timestamptz not null default now()
);

create index cjenici_venue_id_idx on cjenici (venue_id);

alter table cjenici enable row level security;

-- Samo vlasnik — cjenici se nigdje javno ne prikazuju odvojeno (javni izvoz
-- i dalje agregira sve stavke objekta zajedno, bez obzira na cjenik).
create policy cjenici_owner_all on cjenici
  for all using (
    exists (select 1 from venues v where v.id = cjenici.venue_id and v.owner_user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from venues v where v.id = cjenici.venue_id and v.owner_user_id = (select auth.uid()))
  );

-- on delete cascade (ne set null): "obriši cijeli cjenik" mora biti
-- predvidljiva radnja — briše i sve stavke unutar njega, ne ostavlja ih
-- odjednom "negrupirane". Postojeće stavke (cjenik_id null) ostaju
-- netaknute i dalje uključene u izvoz — migracija ne zahtijeva retroaktivno
-- grupiranje.
alter table items
  add column cjenik_id uuid references cjenici (id) on delete cascade;

create index items_cjenik_id_idx on items (cjenik_id);

-- Grupirane usluge (item_groups, iz ranije migracije 0010) trebaju istu
-- granicu da se ne "procure" kroz sve cjenike bez obzira na odabir.
alter table item_groups
  add column cjenik_id uuid references cjenici (id) on delete cascade;

create index item_groups_cjenik_id_idx on item_groups (cjenik_id);
