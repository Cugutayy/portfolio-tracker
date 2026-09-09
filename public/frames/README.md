# Frames — visual journal prototype

Path: `/frames/`

## Design direction

This prototype intentionally reuses the visual DNA of snmez.xyz without copying the hub layout literally:

- Instrument Serif + DM Mono editorial typography
- hairline rules and restrained accent colour
- subtle fixed grain
- large cinematic image surfaces
- asymmetric editorial rhythm instead of a uniform masonry feed
- `FLOW` for immersive browsing and `INDEX` for archive/collection navigation
- quiet field-note cards for coordinates, altitude, weather, context or short facts
- fullscreen keyboard/swipe viewer
- responsive image convention (2K for normal screens, 4K for wide/high-density feature images)

The sample imagery currently reuses existing repository assets only so the prototype has zero licensing/dependency risk. Replace them with the owner's photos once the content pipeline is wired.

## Recommended content model

```ts
Collection {
  id
  slug
  title
  subtitle?
  date
  location?
  coverImage
  status: draft | published
  blocks: Array<PhotoBlock | NoteBlock | TextBlock>
}

PhotoBlock {
  type: 'photo'
  imageKey
  alt
  caption?
  layout: 'hero' | 'wide' | 'portrait' | 'standard'
  location?
  takenAt?
  camera?
}

NoteBlock {
  type: 'note'
  eyebrow?
  title
  body
  sourceUrl?
}
```

## Upload architecture recommendation

The existing site already uses Cloudflare Pages Functions and D1. For the journal, the cleanest native stack is:

- **Cloudflare R2** — originals + generated display variants
- **Cloudflare D1** — collection/post metadata and ordering
- **Pages Functions** — authenticated admin API
- **`/frames/admin/`** — simple private upload/editor interface

Suggested upload flow:

1. Sign in to `/frames/admin/`.
2. Create a collection or single frame.
3. Drag/drop HEIC/JPEG/PNG images.
4. Upload originals to R2.
5. Store title, alt text, date, location, layout and field-note blocks in D1.
6. Frontend reads only published content.

Do not publish raw GPS EXIF by default. Strip exact GPS from public derivatives unless explicitly enabled.

## Next implementation steps

1. Replace sample assets with real owner photos.
2. Add R2 + D1 bindings and authenticated upload API.
3. Build `/frames/admin/` with drag/drop ordering and preview.
4. Add responsive image derivatives and immutable caching.
5. Add OG image/meta per collection.
6. Move to a dedicated domain later without changing the content model.
