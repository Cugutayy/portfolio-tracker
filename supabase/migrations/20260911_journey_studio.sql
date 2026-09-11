-- Journey Notes: authenticated studio + persistent photo database.
-- Idempotent: safe to run repeatedly on the connected project.

create extension if not exists pgcrypto;

create table if not exists public.journey_photos (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  summary text not null default '',
  body jsonb not null default '[]'::jsonb,
  place text not null default '',
  category text not null default 'Diğer',
  image_url text not null,
  thumbnail_url text,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  position bigint not null default 0,
  published boolean not null default false,
  file_hash text,
  storage_path text,
  original_filename text,
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journey_photos
  add column if not exists file_hash text,
  add column if not exists storage_path text,
  add column if not exists original_filename text,
  add column if not exists taken_at timestamptz;

alter table public.journey_photos
  alter column title set default '',
  alter column category set default 'Diğer';

create or replace function public.journey_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists journey_photos_touch_updated_at on public.journey_photos;
create trigger journey_photos_touch_updated_at
before update on public.journey_photos
for each row execute function public.journey_touch_updated_at();

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

create index if not exists journey_photos_published_position_idx
on public.journey_photos (published, position, created_at desc);

create index if not exists journey_photos_owner_position_idx
on public.journey_photos (owner_id, position, created_at);

create unique index if not exists journey_photos_owner_hash_uidx
on public.journey_photos (owner_id, file_hash)
where file_hash is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journey-photos',
  'journey-photos',
  true,
  26214400,
  array['image/jpeg','image/png','image/webp','image/avif']
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

-- Remove the temporary anonymous hero exception used during early prototyping.
drop policy if exists "temporary journey hero upload" on storage.objects;
