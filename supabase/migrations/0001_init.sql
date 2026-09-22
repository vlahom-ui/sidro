-- Sidro — inicijalna shema baze
-- Zaseban Supabase projekt, nema veze s dubrovnikgastro shemom.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------

create type venue_status as enum ('draft', 'published');
create type item_tip as enum ('proizvod', 'usluga');
create type item_dostupnost as enum ('dostupno', 'nedostupno');
create type import_source_type as enum ('pdf', 'docx', 'xlsx', 'csv', 'xml', 'url', 'tekst');
create type generated_file_format as enum ('csv', 'xml');

-- ---------------------------------------------------------------------
-- venues
-- ---------------------------------------------------------------------

create table venues (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  naziv text not null,
  slug text not null unique,
  oblik_objekta text not null,
  adresa text not null,
  oib text,
  status venue_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index venues_owner_user_id_idx on venues (owner_user_id);
create index venues_slug_idx on venues (slug);

-- ---------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------

create table items (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  tip item_tip not null,
  naziv text not null,
  sifra text,
  marka text,
  jedinica_mjere text,
  cijena_po_jedinici numeric(12, 2),
  cijena numeric(12, 2) not null,
  poseban_oblik_prodaje boolean not null default false,
  naziv_posebnog_oblika text,
  sidrena_cijena numeric(12, 2),
  barkod text,
  dostupnost item_dostupnost,
  jezik text not null default 'hr',
  kategorija text,
  redoslijed integer,
  url_slike text,
  first_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_proizvod_fields_chk check (
    tip = 'proizvod' or (
      sifra is null and marka is null and jedinica_mjere is null
      and cijena_po_jedinici is null and barkod is null and dostupnost is null
    )
  )
);

create index items_venue_id_idx on items (venue_id);
create index items_venue_tip_idx on items (venue_id, tip);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_set_updated_at
  before update on items
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------
-- price_history — append-only, nikad se ne mijenjaju postojeći retci
-- ---------------------------------------------------------------------

create table price_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id) on delete cascade,
  cijena numeric(12, 2) not null,
  vrijedi_od timestamptz not null default now(),
  vrijedi_do timestamptz
);

create index price_history_item_id_idx on price_history (item_id);
create index price_history_item_id_vrijedi_do_idx on price_history (item_id, vrijedi_do);

-- Zatvori prethodni važeći redak i otvori novi kad se cijena promijeni.
create or replace function record_price_history()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into price_history (item_id, cijena, vrijedi_od)
    values (new.id, new.cijena, now());
  elsif tg_op = 'UPDATE' and new.cijena is distinct from old.cijena then
    update price_history
      set vrijedi_do = now()
      where item_id = old.id and vrijedi_do is null;
    insert into price_history (item_id, cijena, vrijedi_od)
    values (new.id, new.cijena, now());
  end if;
  return new;
end;
$$;

create trigger items_record_price_history
  after insert or update on items
  for each row
  execute function record_price_history();

-- ---------------------------------------------------------------------
-- import_sources
-- ---------------------------------------------------------------------

create table import_sources (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  source_type import_source_type not null,
  status text not null,
  method text not null,
  item_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index import_sources_venue_id_idx on import_sources (venue_id);

-- ---------------------------------------------------------------------
-- generated_files
-- ---------------------------------------------------------------------

create table generated_files (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  format generated_file_format not null,
  tip item_tip not null,
  file_url text not null,
  version_number integer not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_current boolean not null default true
);

create index generated_files_venue_id_idx on generated_files (venue_id);
create index generated_files_venue_current_idx on generated_files (venue_id, tip, format, is_current);

-- ---------------------------------------------------------------------
-- image_candidates
-- ---------------------------------------------------------------------

create table image_candidates (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  url_slike text not null,
  matched_item_id uuid references items (id) on delete set null,
  source_url text not null,
  created_at timestamptz not null default now()
);

create index image_candidates_venue_id_idx on image_candidates (venue_id);
create index image_candidates_unmatched_idx on image_candidates (venue_id) where matched_item_id is null;

-- ---------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  venue_id uuid references venues (id) on delete set null,
  action text not null,
  outcome text not null,
  details text,
  "timestamp" timestamptz not null default (now() at time zone 'utc')
);

create index audit_log_venue_id_idx on audit_log (venue_id);
create index audit_log_timestamp_idx on audit_log ("timestamp" desc);

-- ---------------------------------------------------------------------
-- consents
-- ---------------------------------------------------------------------

create table consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid references venues (id) on delete set null,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text
);

create index consents_user_id_idx on consents (user_id);

-- ---------------------------------------------------------------------
-- rate_limits — jednostavno brojanje zahtjeva po korisniku/akciji/prozoru
-- ---------------------------------------------------------------------

create table rate_limits (
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (user_id, action, window_start)
);

create or replace function check_and_increment_rate_limit(
  p_user_id uuid,
  p_action text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into rate_limits (user_id, action, window_start, request_count)
  values (p_user_id, p_action, v_window_start, 1)
  on conflict (user_id, action, window_start)
    do update set request_count = rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table venues enable row level security;
alter table items enable row level security;
alter table price_history enable row level security;
alter table import_sources enable row level security;
alter table generated_files enable row level security;
alter table image_candidates enable row level security;
alter table audit_log enable row level security;
alter table consents enable row level security;
alter table rate_limits enable row level security;

-- venues: vlasnik vidi i uređuje svoje; javnost smije čitati objavljene (za /c/{slug})
create policy venues_owner_select on venues
  for select using (owner_user_id = auth.uid());

create policy venues_public_select on venues
  for select using (status = 'published');

create policy venues_owner_insert on venues
  for insert with check (owner_user_id = auth.uid());

create policy venues_owner_update on venues
  for update using (owner_user_id = auth.uid());

create policy venues_owner_delete on venues
  for delete using (owner_user_id = auth.uid());

-- items: vlasnik objekta upravlja svojim stavkama; javnost čita stavke objavljenih objekata
create policy items_owner_all on items
  for all using (
    exists (select 1 from venues v where v.id = items.venue_id and v.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from venues v where v.id = items.venue_id and v.owner_user_id = auth.uid())
  );

create policy items_public_select on items
  for select using (
    exists (select 1 from venues v where v.id = items.venue_id and v.status = 'published')
  );

-- price_history: samo vlasnik objekta
create policy price_history_owner_select on price_history
  for select using (
    exists (
      select 1 from items i
      join venues v on v.id = i.venue_id
      where i.id = price_history.item_id and v.owner_user_id = auth.uid()
    )
  );

-- import_sources: samo vlasnik
create policy import_sources_owner_all on import_sources
  for all using (
    exists (select 1 from venues v where v.id = import_sources.venue_id and v.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from venues v where v.id = import_sources.venue_id and v.owner_user_id = auth.uid())
  );

-- generated_files: vlasnik upravlja; javnost čita datoteke objavljenih objekata
create policy generated_files_owner_all on generated_files
  for all using (
    exists (select 1 from venues v where v.id = generated_files.venue_id and v.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from venues v where v.id = generated_files.venue_id and v.owner_user_id = auth.uid())
  );

create policy generated_files_public_select on generated_files
  for select using (
    is_current and exists (select 1 from venues v where v.id = generated_files.venue_id and v.status = 'published')
  );

-- image_candidates: samo vlasnik
create policy image_candidates_owner_all on image_candidates
  for all using (
    exists (select 1 from venues v where v.id = image_candidates.venue_id and v.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from venues v where v.id = image_candidates.venue_id and v.owner_user_id = auth.uid())
  );

-- audit_log: vlasnik objekta vidi log svog objekta; upisuje samo server (service role)
create policy audit_log_owner_select on audit_log
  for select using (
    venue_id is not null and exists (select 1 from venues v where v.id = audit_log.venue_id and v.owner_user_id = auth.uid())
  );

-- consents: korisnik vidi svoje
create policy consents_owner_select on consents
  for select using (user_id = auth.uid());

create policy consents_owner_insert on consents
  for insert with check (user_id = auth.uid());

-- rate_limits: nema klijentskog pristupa, samo service role (RLS bez policy = zabranjeno svima osim service role)

-- ---------------------------------------------------------------------
-- Storage bucket za privatni upload izvora cjenika
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('import-uploads', 'import-uploads', false)
on conflict (id) do nothing;

create policy import_uploads_owner_select on storage.objects
  for select using (
    bucket_id = 'import-uploads'
    and exists (
      select 1 from venues v
      where v.id::text = (storage.foldername(name))[1]
        and v.owner_user_id = auth.uid()
    )
  );

create policy import_uploads_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'import-uploads'
    and exists (
      select 1 from venues v
      where v.id::text = (storage.foldername(name))[1]
        and v.owner_user_id = auth.uid()
    )
  );

create policy import_uploads_owner_delete on storage.objects
  for delete using (
    bucket_id = 'import-uploads'
    and exists (
      select 1 from venues v
      where v.id::text = (storage.foldername(name))[1]
        and v.owner_user_id = auth.uid()
    )
  );

-- Bucket za generirane .csv/.xml datoteke i QR kodove (javno čitljiv jer se ionako serviraju s /c/{slug})
insert into storage.buckets (id, name, public)
values ('generated-files', 'generated-files', true)
on conflict (id) do nothing;
