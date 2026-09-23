-- record_price_history() insertira/ažurira price_history retke u ime
-- pozivatelja (session-scoped klijent koji poštuje RLS), ali price_history
-- ima RLS uključen sa samo SELECT policy za vlasnika — nema INSERT/UPDATE
-- policy. Bez security definer, trigger na svaki INSERT/UPDATE nad items
-- pokušava upisati u price_history, RLS to odbija (default-deny bez
-- policy), trigger baca iznimku i CIJELA items INSERT/UPDATE izjava se
-- rollbacka — točno "sve ili ništa" ponašanje prijavljeno kod batch-save
-- uvoza (i identično bi pogodilo pojedinačno dodavanje stavke te izmjenu
-- cijene postojeće stavke, budući da koriste isti trigger).
--
-- Isti obrazac (security definer za funkciju koja mora pisati u tablicu s
-- RLS bez policy za pozivatelja) već je korišten za
-- check_and_increment_rate_limit nad rate_limits — ovdje se primjenjuje
-- na identičan slučaj.
create or replace function record_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
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
