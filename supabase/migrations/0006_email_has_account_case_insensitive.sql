-- Supabase (GoTrue) normalizira/uspoređuje email adrese case-insensitive,
-- pa email_has_account mora raditi isto — inače bi "Ime@Example.com" i
-- "ime@example.com" bili tretirani kao različiti korisnici u ovoj provjeri
-- iako Supabase zna da je riječ o istom računu.
create or replace function public.email_has_account(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(p_email)
  );
$$;
