-- Zakonski relevantan datum "prvog pojavljivanja" stavke je kad postane
-- vidljiva javnosti (objava cjenika), ne kad je administrator utipkao
-- podatke dok je objekt još neobjavljen (status = 'draft'). first_seen_at
-- više ne dobiva now() automatski kod insertanja — aplikacijski kod
-- (create rute + publish ruta) odlučuje eksplicitno prema venues.status.
--
-- Ne dira postojeće retke — već postavljene vrijednosti ostaju kakve jesu,
-- popravak vrijedi samo za nove stavke od sad nadalje.
alter table items alter column first_seen_at drop default;
alter table items alter column first_seen_at drop not null;
