-- Journey Notes media pipeline v2.
-- Keeps originals, generates display/thumbnail derivatives in the client,
-- preserves published state, and soft-deletes rows to prevent accidental loss.

alter table public.journey_photos
  add column if not exists original_url text,
  add column if not exists display_path text,
  add column if not exists thumbnail_path text,
  add column if not exists mime_type text,
  add column if not exists byte_size bigint,
  add column if not exists processing_version integer not null default 2,
  add column if not exists published_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists display_width integer,
  add column if not exists thumbnail_width integer;

update public.journey_photos
set original_url = image_url
where original_url is null;

update public.journey_photos
set published_at = coalesce(published_at, updated_at)
where published = true and published_at is null;

alter table public.journey_photos
  drop constraint if exists journey_photos_position_nonnegative,
  add constraint journey_photos_position_nonnegative check (position >= 0),
  drop constraint if exists journey_photos_title_length,
  add constraint journey_photos_title_length check (char_length(title) <= 110),
  drop constraint if exists journey_photos_summary_length,
  add constraint journey_photos_summary_length check (char_length(summary) <= 400),
  drop constraint if exists journey_photos_place_length,
  add constraint journey_photos_place_length check (char_length(place) <= 100),
  drop constraint if exists journey_photos_body_array,
  add constraint journey_photos_body_array check (jsonb_typeof(body) = 'array'),
  drop constraint if exists journey_photos_byte_size_nonnegative,
  add constraint journey_photos_byte_size_nonnegative check (byte_size is null or byte_size >= 0),
  drop constraint if exists journey_photos_hash_format,
  add constraint journey_photos_hash_format check (
    file_hash is null or file_hash ~ '^[0-9a-f]{64}$'
  ),
  drop constraint if exists journey_photos_display_width_positive,
  add constraint journey_photos_display_width_positive
    check (display_width is null or display_width > 0),
  drop constraint if exists journey_photos_thumbnail_width_positive,
  add constraint journey_photos_thumbnail_width_positive
    check (thumbnail_width is null or thumbnail_width > 0);

create or replace function public.journey_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();

  if new.published = true and (tg_op = 'INSERT' or old.published is distinct from true) then
    new.published_at = coalesce(new.published_at, now());
  elsif new.published = false then
    new.published_at = null;
  end if;

  return new;
end;
$$;

drop index if exists public.journey_photos_owner_hash_uidx;
create unique index journey_photos_owner_hash_uidx
on public.journey_photos (owner_id, file_hash)
where file_hash is not null and deleted_at is null;

drop index if exists public.journey_photos_published_position_idx;
create index journey_photos_published_position_idx
on public.journey_photos (published, position, created_at desc)
where deleted_at is null;

create index if not exists journey_photos_deleted_at_idx
on public.journey_photos (deleted_at)
where deleted_at is not null;

drop policy if exists "journey public can read published" on public.journey_photos;
create policy "journey public can read published"
on public.journey_photos
for select
to anon
using (published = true and deleted_at is null);

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/heic',
    'image/heif'
  ]
where id = 'journey-photos';
