-- Restrict Journey write access to an explicit admin allowlist.
create table if not exists public.journey_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.journey_admins enable row level security;
revoke all on public.journey_admins from anon;
grant select on public.journey_admins to authenticated;

drop policy if exists "journey admin can read own marker" on public.journey_admins;
create policy "journey admin can read own marker"
on public.journey_admins
for select
to authenticated
using (user_id = (select auth.uid()));

insert into public.journey_admins (user_id)
values ('7303f0a5-6cf1-4a3b-8f1b-aac9bcdaf3ab')
on conflict (user_id) do nothing;

drop policy if exists "journey authenticated can read own" on public.journey_photos;
create policy "journey authenticated can read own"
on public.journey_photos
for select
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "journey authenticated can insert own" on public.journey_photos;
create policy "journey authenticated can insert own"
on public.journey_photos
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "journey authenticated can update own" on public.journey_photos;
create policy "journey authenticated can update own"
on public.journey_photos
for update
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
)
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "journey authenticated can delete own" on public.journey_photos;
create policy "journey authenticated can delete own"
on public.journey_photos
for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "journey owner uploads" on storage.objects;
create policy "journey owner uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "journey owner updates" on storage.objects;
create policy "journey owner updates"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "journey owner deletes" on storage.objects;
create policy "journey owner deletes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
);
