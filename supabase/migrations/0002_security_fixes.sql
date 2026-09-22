-- Popravci iz security advisora nakon 0001_init

-- 1 i 2: eksplicitan search_path na obje trigger funkcije
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function record_price_history()
returns trigger
language plpgsql
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

-- 3: check_and_increment_rate_limit vise ne prima p_user_id kao parametar
-- koji poziva moze birati proizvoljno - koristi auth.uid() direktno, cime
-- se onemogucava manipulacija tudjeg rate limita
create or replace function check_and_increment_rate_limit(
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
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'check_and_increment_rate_limit requires an authenticated user';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into rate_limits (user_id, action, window_start, request_count)
  values (v_user_id, p_action, v_window_start, 1)
  on conflict (user_id, action, window_start)
    do update set request_count = rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;
