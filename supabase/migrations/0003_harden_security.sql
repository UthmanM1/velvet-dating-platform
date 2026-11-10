-- Applied after advisor findings: helper functions must not live in the API-exposed `public` schema,
-- and the SECURITY DEFINER view is dropped. Discovery is served by the server layer (service role),
-- which never returns dob or coordinates.
create schema if not exists private;
grant usage on schema private to anon, authenticated;
alter function public.is_admin() set schema private;
alter function public.is_blocked_pair(uuid, uuid) set schema private;
drop view if exists public.public_profiles;
