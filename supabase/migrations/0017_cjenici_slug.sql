-- Slug po cjeniku, unikatan po objektu (ne globalno) — /c/{venue_slug}/
-- {cjenik_slug} je već jednoznačan kroz kombinaciju oba dijela URL-a, isto
-- načelo kao venues.slug. Za razliku od nekih ranijih odluka u ovom
-- projektu (npr. venue adresa), ovdje JE sigurno retroaktivno generirati
-- slug za postojeće cjenike — deterministički izveden iz naziva preko iste
-- slugify() funkcije (lib/slug.ts) koja se već koristi za venues.slug, ne
-- nagađanje semantike. Vrijednosti ispod izračunate izvan baze pokretanjem
-- stvarne slugify() funkcije nad trenutnim podacima (samo 2 retka postoje
-- u produkciji u trenutku ove migracije — "Light lunch" i "Zuzori glavni
-- menu", oba na istom objektu, bez sudara).
alter table cjenici add column slug text;

update cjenici set slug = 'light-lunch' where id = 'e800a4b7-7c70-44df-a961-6804100a8684';
update cjenici set slug = 'zuzori-glavni-menu' where id = '4b1338ed-0913-4706-8710-746975c82869';

alter table cjenici alter column slug set not null;
create unique index cjenici_venue_id_slug_idx on cjenici (venue_id, slug);
