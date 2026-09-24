-- Grupirane usluge s varijantnim cijenama (multi-tier pricing).
-- `items` se ne mijenja u svrsi — i dalje flat, jedan redak = jedna cijena,
-- izvozi se u CSV/XML identično kao danas. Ovo dodaje tanak sloj grupiranja
-- iznad nje: item_groups je "kišobran" (naziv/opis/trajanje), svaka
-- varijanta je i dalje običan items redak s item_group_id + variant_label.
create table item_groups (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  tip item_tip not null,
  naziv text not null,
  opis text,
  trajanje text,
  created_at timestamptz not null default now()
);

create index item_groups_venue_id_idx on item_groups (venue_id);

alter table item_groups enable row level security;

-- Isti obrazac kao items_owner_all / items_public_select.
create policy item_groups_owner_all on item_groups
  for all using (
    exists (select 1 from venues v where v.id = item_groups.venue_id and v.owner_user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from venues v where v.id = item_groups.venue_id and v.owner_user_id = (select auth.uid()))
  );

create policy item_groups_public_select on item_groups
  for select using (
    exists (select 1 from venues v where v.id = item_groups.venue_id and v.status = 'published')
  );

-- on delete set null (namjerno, ne cascade): brisanje grupe ne smije
-- povući za sobom brisanje prodajnih stavki — varijante jednostavno postanu
-- negrupirane, korisnik ih i dalje vidi i uređuje kao obične stavke.
alter table items
  add column item_group_id uuid references item_groups (id) on delete set null,
  add column variant_label text;

create index items_item_group_id_idx on items (item_group_id);
