-- Admin notifikacija (Resend) na svaku novu registraciju i novi venues zapis.
--
-- Koristi ugrađenu supabase_functions.http_request() funkciju (isti mehanizam
-- koji Supabase Dashboard generira za "Database Webhooks"), koja asinkrono
-- poziva deployanu Edge Function preko pg_net.
--
-- PRIJE primjene ove migracije na produkciji:
--   1. Deployati funkciju:  supabase functions deploy notify-admin
--   2. Postaviti secrete:   supabase secrets set RESEND_API_KEY=... ADMIN_NOTIFICATION_EMAIL=...
--                            RESEND_FROM_EMAIL=... APP_URL=... NOTIFY_ADMIN_WEBHOOK_SECRET=...
--   3. Zamijeniti <project-ref> ispod stvarnom referencom Supabase projekta
--      i <webhook-secret> vrijednošću iz koraka 2 (mora se podudarati s
--      NOTIFY_ADMIN_WEBHOOK_SECRET tajnom edge funkcije).

create extension if not exists pg_net;

create trigger venues_notify_admin
  after insert on public.venues
  for each row
  execute function supabase_functions.http_request(
    'https://<project-ref>.functions.supabase.co/notify-admin',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<webhook-secret>"}',
    '{}',
    '5000'
  );

create trigger auth_users_notify_admin
  after insert on auth.users
  for each row
  execute function supabase_functions.http_request(
    'https://<project-ref>.functions.supabase.co/notify-admin',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<webhook-secret>"}',
    '{}',
    '5000'
  );
