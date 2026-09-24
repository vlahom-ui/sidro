-- Objekt-razinski default za tip novih stavki (proizvod/usluga). Nullable —
-- postojeći objekti bez postavljene vrijednosti zadržavaju dosadašnje
-- ponašanje (heuristička klasifikacija kod uvoza, "proizvod" kod ručnog
-- dodavanja).
alter table venues add column default_tip item_tip;
