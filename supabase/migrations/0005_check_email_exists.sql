-- Supabase auth.signUp() namjerno vraća identičan (obfuscated) odgovor za
-- postojeći POTVRĐEN korisnik (identities: []) i za postojeći NEPOTVRĐEN
-- korisnik (identities NIJE prazan — GoTrue vraća stvarni, već postojeći
-- redak, isto kao za potpuno nov signup) — namjerno, radi sprječavanja
-- enumeracije korisnika. To znači da se iz samog signUp() odgovora ne može
-- pouzdano razlikovati "nov korisnik" od "ponovljena registracija
-- nepotvrđenog korisnika".
--
-- Ova funkcija daje pouzdan odgovor izravno iz auth.users, neovisno o
-- statusu potvrde, kako bi aplikacija mogla korisniku jasno reći da račun
-- s tim emailom već postoji prije nego uopće pozove signUp().
create or replace function public.email_has_account(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from auth.users where email = p_email
  );
$$;

revoke execute on function public.email_has_account(text) from public;
grant execute on function public.email_has_account(text) to anon, authenticated;
