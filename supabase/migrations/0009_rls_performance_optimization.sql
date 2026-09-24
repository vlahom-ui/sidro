-- Supabase performance advisor: auth_rls_initplan (12 nalaza) + unindexed_foreign_keys (2 nalaza).
-- Baza je trenutno mala pa ništa od ovoga nije hitno, ali popravci su
-- jeftini i bezopasni sad — isto ponašanje/sigurnost, samo brže na skali
-- (planner evaluira (select auth.uid()) jednom po upitu umjesto po retku).
--
-- Namjerno NE dirano (vidi brief): multiple_permissive_policies na venues/
-- items/generated_files (vlasnička + javna SELECT politika je namjeran
-- dizajn, spajanje u OR bi otežalo čitljivost za zanemarivu dobit na ovoj
-- skali) i unused_index nalazi (baza premlada da bi bili mjerodavni).

-- venues
alter policy venues_owner_select on venues
  using (owner_user_id = (select auth.uid()));

alter policy venues_owner_insert on venues
  with check (owner_user_id = (select auth.uid()));

alter policy venues_owner_update on venues
  using (owner_user_id = (select auth.uid()));

alter policy venues_owner_delete on venues
  using (owner_user_id = (select auth.uid()));

-- items
alter policy items_owner_all on items
  using (
    exists (select 1 from venues v where v.id = items.venue_id and v.owner_user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from venues v where v.id = items.venue_id and v.owner_user_id = (select auth.uid()))
  );

-- price_history
alter policy price_history_owner_select on price_history
  using (
    exists (
      select 1 from items i
      join venues v on v.id = i.venue_id
      where i.id = price_history.item_id and v.owner_user_id = (select auth.uid())
    )
  );

-- import_sources
alter policy import_sources_owner_all on import_sources
  using (
    exists (select 1 from venues v where v.id = import_sources.venue_id and v.owner_user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from venues v where v.id = import_sources.venue_id and v.owner_user_id = (select auth.uid()))
  );

-- generated_files
alter policy generated_files_owner_all on generated_files
  using (
    exists (select 1 from venues v where v.id = generated_files.venue_id and v.owner_user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from venues v where v.id = generated_files.venue_id and v.owner_user_id = (select auth.uid()))
  );

-- image_candidates
alter policy image_candidates_owner_all on image_candidates
  using (
    exists (select 1 from venues v where v.id = image_candidates.venue_id and v.owner_user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from venues v where v.id = image_candidates.venue_id and v.owner_user_id = (select auth.uid()))
  );

-- audit_log
alter policy audit_log_owner_select on audit_log
  using (
    venue_id is not null and exists (
      select 1 from venues v where v.id = audit_log.venue_id and v.owner_user_id = (select auth.uid())
    )
  );

-- consents
alter policy consents_owner_select on consents
  using (user_id = (select auth.uid()));

alter policy consents_owner_insert on consents
  with check (user_id = (select auth.uid()));

-- Nedostajući indeksi na foreign key stupcima
create index consents_venue_id_idx on consents (venue_id);
create index image_candidates_matched_item_id_idx on image_candidates (matched_item_id);
