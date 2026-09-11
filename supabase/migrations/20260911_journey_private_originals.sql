-- Keep original photo files private and expose only presentation fields to anon.

alter table public.journey_photos
  add column if not exists original_bucket text;

update public.journey_photos
set original_bucket = 'journey-photos'
where storage_path is not null
  and original_bucket is null;

alter table public.journey_photos
  drop constraint if exists journey_photos_original_bucket_allowed,
  add constraint journey_photos_original_bucket_allowed
    check (
      original_bucket is null
      or original_bucket in ('journey-photos', 'journey-originals')
    );

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'journey-originals',
  'journey-originals',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','image/avif','image/heic','image/heif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

revoke all privileges on public.journey_photos from anon;
grant select (
  id,title,summary,body,place,category,image_url,thumbnail_url,
  width,height,display_width,thumbnail_width,position,published,published_at
) on public.journey_photos to anon;

grant select, insert, update, delete on public.journey_photos to authenticated;

drop policy if exists "journey images public read" on storage.objects;
create policy "journey images public read"
on storage.objects for select to public
using (bucket_id = 'journey-photos');

drop policy if exists "journey originals admin read" on storage.objects;
create policy "journey originals admin read"
on storage.objects for select to authenticated
using (
  bucket_id = 'journey-originals'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "journey owner uploads" on storage.objects;
create policy "journey owner uploads"
on storage.objects for insert to authenticated
with check (
  exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
  and (
    (
      bucket_id = 'journey-photos'
      and (
        (storage.foldername(name))[1] = 'media'
        or (storage.foldername(name))[1] = (select auth.uid())::text
      )
    )
    or (
      bucket_id = 'journey-originals'
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
  )
);

drop policy if exists "journey owner updates" on storage.objects;
create policy "journey owner updates"
on storage.objects for update to authenticated
using (
  exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
  and (
    (
      bucket_id = 'journey-photos'
      and (
        (storage.foldername(name))[1] = 'media'
        or (storage.foldername(name))[1] = (select auth.uid())::text
      )
    )
    or (
      bucket_id = 'journey-originals'
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
  )
)
with check (
  exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
  and (
    (
      bucket_id = 'journey-photos'
      and (
        (storage.foldername(name))[1] = 'media'
        or (storage.foldername(name))[1] = (select auth.uid())::text
      )
    )
    or (
      bucket_id = 'journey-originals'
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
  )
);

drop policy if exists "journey owner deletes" on storage.objects;
create policy "journey owner deletes"
on storage.objects for delete to authenticated
using (
  exists (
    select 1 from public.journey_admins a
    where a.user_id = (select auth.uid())
  )
  and (
    (
      bucket_id = 'journey-photos'
      and (
        (storage.foldername(name))[1] = 'media'
        or (storage.foldername(name))[1] = (select auth.uid())::text
      )
    )
    or (
      bucket_id = 'journey-originals'
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
  )
);
