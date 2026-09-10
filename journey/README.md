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

## Draft studio

The footer opens a local draft studio. It supports multiple JPG/PNG/WebP files, title/category/place/summary/body editing, ordering, removal with undo, IndexedDB persistence, JSON backup with embedded images and a local blog preview. Limits are 20 files, 25 MB per file, 50 megapixels per file and 100 MB of combined source data.

**The studio does not publish to the server.** Its scope is deliberately explained in the UI. Browser storage is device and origin specific. JSON backup is currently export only. Server publishing, authentication, asset storage and an import/restore workflow are subsequent work, not implemented features.

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
