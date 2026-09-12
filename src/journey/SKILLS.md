# Journey implementation rules

Read `../../SKILLS.md` first. These rules are Journey-specific and additive.

## Non-negotiables

- The opening hero remains `/journey/hero-snow.webp` unless explicitly changed.
- Use Journey's real photo archive for all visual layouts.
- Do not generate replacement imagery for a code/site change request.
- Keep full-photo reader images naturally proportioned and viewport-safe.
- Uniform crops are allowed only for intentionally uniform gallery grids.
- Preserve auth/admin/password-recovery/private-original protections during public redesign work.
- Avoid generic AI-style UI and crude SVG maps/visualizations.
- Prefer real geographic/data tooling when a map or quantitative visualization is needed.
- Approved visual references should be implemented with high fidelity.
- Always check mobile overflow, native swipe, reduced motion, page-level horizontal scroll and reader navigation.
- If the user rejects a component, remove it from actual rendered JSX/DOM and clean its dead code.
