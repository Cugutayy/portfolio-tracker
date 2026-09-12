# SKILLS.md — Design & Implementation Standard

This repository follows a high-fidelity, editorial, production-grade design standard.

## Core design preference

When working on visual/UI tasks, do not default to simple, generic, or "AI-generated landing page" aesthetics.

Avoid:
- generic gradient blobs
- excessive glassmorphism
- stock startup-card layouts
- decorative 3D objects with no purpose
- placeholder charts
- fake maps
- crude hand-drawn SVG blobs pretending to be advanced visualizations
- arbitrary asymmetry that feels accidental
- large empty sections without compositional intent
- visual effects that do not communicate information
- changing approved hero imagery without explicit instruction

Prefer:
- editorial composition
- strong typographic hierarchy
- deliberate asymmetry anchored to a real grid
- premium spacing and optical alignment
- real data where data is shown
- real geographic tools/data for maps
- real archive imagery instead of invented filler
- restrained, meaningful motion
- high-fidelity responsive behavior
- production-quality implementation rather than mock-only output

## Approved-reference rule

When the user explicitly approves a visual mockup/reference and asks for it "birebir":
- treat the reference as a design specification, not loose inspiration
- reproduce composition, spacing, hierarchy, proportions, color relationships, typography scale, card geometry, section rhythm and responsive intent as closely as practical
- use the user's real archive/content in place of reference placeholder imagery
- do not reinterpret the approved composition unless needed for accessibility, responsiveness, performance, or functional correctness
- preserve any explicitly protected element (for Journey, the opening snow hero remains /journey/hero-snow.webp unless the user explicitly changes that requirement)

## Implementation standard

For site-change requests:
- implement in real React/CSS/JS code
- push working changes to GitHub when repository access is available
- do not substitute image generation for a requested website/code change
- verify build/deploy state when deployment tools are available
- verify runtime behavior, not only compilation

## Advanced tools

Use advanced tools when they materially improve the experience:
- CSS Grid/Subgrid-style composition patterns
- Canvas
- WebGL
- Three.js
- GLSL/shaders
- GSAP-like motion patterns when appropriate
- Leaflet / CARTO / OpenStreetMap for real maps
- real coordinate data
- actual archive statistics
- perceptual color systems / image-derived palettes
- CLIP/embedding/UMAP-style visual atlas concepts when appropriate
- native browser APIs for performant interaction

Do not use advanced tooling merely for spectacle. It should support the visual idea, navigation, data, or story.

## SVG rule

SVG is fine for:
- icons
- precise marks
- simple geometric UI details
- real vector assets

Do not use simplistic SVG approximations for:
- world maps
- scientific/data visualizations
- complex geographic systems
- anything intended to read as a sophisticated data product

When a richer real-data/tool solution exists, use it.

## Photography

Journey is photo-first.
- use the actual Journey archive
- preserve natural image ratios where the design calls for it
- use explicit editorial crops only in layouts that intentionally require uniform cards
- full-photo reader must never accidentally crop or overflow
- constrain portrait and landscape images by viewport using max-width/max-height + object-fit: contain
- keep original/large sources for full reader views where available
- preload/high-priority only for critical hero media
- keep offscreen imagery lazy

## Layout quality

Before considering a layout finished, check:
- optical left/right alignment
- serif overhang/clipping
- section gutters
- viewport overflow
- page-level horizontal scrollbar
- image scaling
- text wrapping
- breakpoint behavior
- card rhythm
- vertical spacing
- edge collisions
- sticky/fixed elements
- browser zoom sensitivity

Avoid "creative randomness." Asymmetry must be visibly intentional and grid-supported.

## Motion

Motion should:
- explain state changes
- support navigation
- preserve spatial continuity
- remain subtle by default

Use:
- opacity
- small translate
- controlled scale
- staged transitions

Always honor:
- prefers-reduced-motion

Do not animate everything.

## Runtime correctness

After UI changes:
- check interactions in the browser
- confirm navigation
- confirm scrolling behavior
- confirm image reader next/previous behavior
- confirm responsive layouts
- confirm no stale component remains in the DOM after the user asks to remove it
- remove dead/unused experiment files when a direction is rejected

A successful build is not enough if runtime behavior is broken.

## Journey-specific rules

For Journey:
- opening hero stays the snow image unless explicitly changed
- use the real Journey archive
- keep nav minimal and intentional
- protect existing auth/admin/private-original behavior when editing presentation
- do not weaken admin allowlists, public-field restrictions, password recovery or private-original protections while redesigning public UI
- when the user rejects a section, remove it from the actual rendered DOM rather than merely creating an alternative alongside it
- do not leave rejected visual experiments visible
- keep mobile interactions native where possible (horizontal swipe, scroll snap)
- avoid template labels and generic portfolio copy

## Quality bar

The target is not "clean enough."
The target is:
- authored
- specific
- editorial
- technically deliberate
- visually polished
- responsive
- production-ready
- comparable in care to strong Awwwards/editorial portfolio work without becoming unusable

Pixel-polish is part of implementation, not an optional final extra.
