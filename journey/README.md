# Journey Notes

Standalone React/Vite photo journal at `/journey/`. The hub links to it through a single Journey Notes card. The former `/frames/` prototype remains available, but its duplicate hub card is no longer mounted.

## Design

Warm paper, terracotta accents and sage note cards; Instrument Serif headlines with Manrope reading text and DM Mono metadata. Photographs sit inside bounded frames alongside short writing. Opening a note navigates to an inline reading page, never a fullscreen gallery. Desktop uses three editorial columns, mobile two. A compact archive, Turkish-normalized search, category collections, locally saved favorites and an optional dark theme are included. Hover motion is limited to fine pointers; reduced-motion preferences are respected.

## Content and image quality

- 139 photographs imported from the owner's `journey_notess_gorseller.zip`.
- 129 source images have a longest dimension of at least 1080 pixels; maximum source width is 1440 pixels.
- The original archive remains outside the repository. Responsive WebP derivatives live in `public/journey/archive/` and the catalog in `src/journey/catalog.json`.
- Images are resized downward only. No AI enhancement, generated detail or fictitious HD label is applied. EXIF metadata is omitted from the public derivatives.
- The first 18 titles and short notes are editorial draft copy written for this design, not quotations from Instagram captions. Other entries use neutral archive numbers. Capture dates, camera metadata and unverified place names are not invented.
- `smallWidth` and `largeWidth` record actual derivative widths for correct `srcset` descriptors.

## Studio / Supabase

The footer opens a private photo studio protected by Supabase email/password authentication. The studio supports multiple JPG/PNG/WebP files, title/category/place/summary/body editing, ordering, removal with undo, preview, cloud draft saving and publishing. IndexedDB remains only as a local recovery copy.

Persistent content lives in the `journey_photos` table and uploaded assets in the `journey-photos` Storage bucket. Row Level Security restricts writes to the authenticated owner while anonymous visitors can read only rows marked `published = true`. The migration is in `supabase/migrations/20260911_journey_studio.sql`.

Required Vite environment variables:

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use the public/anon key only. Never expose a Supabase `service_role` key in the browser bundle. Create the administrator account in Supabase Auth and keep public sign-up disabled if this is intended as a single-owner studio.

## Development

```sh
npm ci
npm run dev
npm run build
```

Open `/journey/`. Vite has separate hub and Journey HTML inputs. Existing hub routes and Cloudflare functions remain intact.

Focused TypeScript validation:

```sh
node node_modules/typescript/bin/tsc --noEmit --jsx react-jsx --esModuleInterop --resolveJsonModule --moduleResolution bundler --module ESNext --target ES2020 --lib ES2020,DOM --strict --skipLibCheck src/journey/main.tsx
```

The repository-wide type check already reports an unrelated `SnifferOpportunity.itemName` error in `src/components/AlbionPage.tsx`. Journey's focused check and the production build pass independently.

## References

- [Another Escape](https://anotherescape.com/) — a nature journal with photography and writing.
- [Field Mag](https://www.fieldmag.com/) — editorial photography and travel stories.
- [Exo Ape / Ottografie](https://www.exoape.com/work/ottografie) — interaction craft and photographic discovery. Journey deliberately uses bounded photographs and reading pages in accordance with the owner's preference.
