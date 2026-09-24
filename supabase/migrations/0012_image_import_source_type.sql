-- Uvoz cjenika izravno iz fotografije (JPG/PNG) — proširuje
-- import_source_type enum da import_sources.source_type može zabilježiti
-- ova dva nova tipa izvora. ADD VALUE se ne može koristiti u istoj
-- transakciji u kojoj je dodan, pa je ovo namjerno samostalna migracija.
alter type import_source_type add value 'jpg';
alter type import_source_type add value 'png';
