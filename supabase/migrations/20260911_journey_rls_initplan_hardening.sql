-- Journey Notes RLS performance hardening.
-- Uses scalar subqueries so auth.uid() is evaluated once per statement.

drop policy if exists "journey authenticated can read own" on public.journey_photos;
create policy "journey authenticated can read own"
on public.journey_photos
for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "journey authenticated can insert own" on public.journey_photos;
create policy "journey authenticated can insert own"
on public.journey_photos
for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "journey authenticated can update own" on public.journey_photos;
create policy "journey authenticated can update own"
on public.journey_photos
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "journey authenticated can delete own" on public.journey_photos;
create policy "journey authenticated can delete own"
on public.journey_photos
for delete
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "journey owner uploads" on storage.objects;
create policy "journey owner uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "journey owner updates" on storage.objects;
create policy "journey owner updates"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "journey owner deletes" on storage.objects;
create policy "journey owner deletes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
