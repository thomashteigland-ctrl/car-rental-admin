-- Run once in Supabase SQL Editor so the Vite app (anon key) can use the rental schema.

grant usage on schema rental to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema rental
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema rental
  to anon, authenticated, service_role;

alter default privileges in schema rental
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges in schema rental
  grant usage, select on sequences
  to anon, authenticated, service_role;

-- Also: Dashboard → Project Settings → API → Exposed schemas → add "rental"
