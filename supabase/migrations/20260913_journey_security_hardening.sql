-- Journey Notes security hardening — 2026-09-13
-- Keep browser access least-privileged and remove externally callable
-- SECURITY DEFINER helpers where they are not required.

-- Journey photos: PostgREST only needs CRUD for signed-in admins.
revoke truncate, references, trigger
on table public.journey_photos
from authenticated;

-- Admin allowlist is read-only from the browser and protected by RLS.
revoke all on table public.journey_admins from authenticated;
grant select (user_id) on table public.journey_admins to authenticated;

-- Auth trigger helper is internal-only.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Signed-in social RLS policies use this helper; it does not need elevated
-- privileges because authenticated users can already SELECT profiles.
create or replace function public.my_profile_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select id
  from public.profiles
  where user_id = auth.uid()
  limit 1;
$$;

revoke execute on function public.my_profile_id() from public, anon;
grant execute on function public.my_profile_id() to authenticated;
