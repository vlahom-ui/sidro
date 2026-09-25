-- Strukturirana adresa (ulica/kućni broj/grad) radi preciznog naziva
-- generirane datoteke — ista ulica postoji u više hrvatskih gradova, a
-- propisani naziv datoteke mora jednoznačno identificirati objekt. Sve tri
-- nullable, ne dira postojeći adresa stupac koji ostaje fallback za
-- objekte kreirane prije ove promjene (bez retroaktivnog nagađanja
-- rastavljanja starog slobodnog teksta u tri polja).
--
-- Namjerno nema poštanski_broj stupca — provjereno kroz više neovisnih
-- izvora da poštanski broj nije dio propisanog naziva datoteke, odlučeno
-- da se ne dodaje ni u bazu ni u formu.
alter table venues
  add column ulica text,
  add column kucni_broj text,
  add column grad text;
