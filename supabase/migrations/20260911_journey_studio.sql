-- Journey Notes: authenticated studio + persistent photo database.
-- Run this once in the connected Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.journey_photos (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Adsız kare',
  summary text not null default '',
  body jsonb not null default '[]'::jsonb,
  place text not null default '',
  category text not null default 'Doğa',
  image_url text not null,
  thumbnail_url text,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journey_photos enable row level security;

drop policy if exists "journey public can read published" on public.journey_photos;
create policy "journey public can read published"
on public.journey_photos
for select
to anon
using (published = true);

drop policy if exists "journey authenticated can read own" on public.journey_photos;
create policy "journey authenticated can read own"
on public.journey_photos
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "journey authenticated can insert own" on public.journey_photos;
create policy "journey authenticated can insert own"
on public.journey_photos
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "journey authenticated can update own" on public.journey_photos;
create policy "journey authenticated can update own"
on public.journey_photos
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "journey authenticated can delete own" on public.journey_photos;
create policy "journey authenticated can delete own"
on public.journey_photos
for delete
to authenticated
using (owner_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journey-photos',
  'journey-photos',
  true,
  26214400,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "journey images public read" on storage.objects;
create policy "journey images public read"
on storage.objects
for select
to public
using (bucket_id = 'journey-photos');

drop policy if exists "journey owner uploads" on storage.objects;
create policy "journey owner uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "journey owner updates" on storage.objects;
create policy "journey owner updates"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "journey owner deletes" on storage.objects;
create policy "journey owner deletes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'journey-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create index if not exists journey_photos_published_position_idx
on public.journey_photos (published, position, created_at desc);
