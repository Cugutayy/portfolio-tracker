-- Mark pre-v2 media rows accurately and keep version values sane.

update public.journey_photos
set processing_version = 1
where display_path is null or thumbnail_path is null;

alter table public.journey_photos
  drop constraint if exists journey_photos_processing_version_positive,
  add constraint journey_photos_processing_version_positive
    check (processing_version >= 1);
