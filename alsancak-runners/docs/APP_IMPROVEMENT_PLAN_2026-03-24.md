# App Improvement Plan (Backend + Frontend)

## Goal
Ship a production-grade running app with stronger trust, retention, and premium UX while keeping scope realistic for a small team.

## Phase 0 (0-3 weeks): Stabilize core trust
- Fix local lint/build toolchain so CI can gate merges.
- Add backend observability baseline: structured logs, request IDs, error-rate dashboards.
- Add API contract tests for auth, activities, community feed, events, and RSVP edge cases.
- Add privacy-safe defaults for activity visibility and map sharing.

## Phase 1 (3-8 weeks): Core retention loop
- Introduce weekly goals + streak model + comeback prompts.
- Upgrade post-run summary cards (progress delta, best split, social CTA).
- Improve feed quality scoring (recency + relationship + quality signals).
- Add challenge MVP (weekly distance + consistency) with anti-spam feed integration.

## Phase 2 (8-14 weeks): Product differentiation
- Build local community layer (clubs, event narratives, shared milestones).
- Add safe route sharing artifacts (blurred start/end, simplified public polyline, map thumbnails).
- Add anomaly checks (impossible speed, teleport jumps, duplicate imports).
- Add notification preference matrix and targeted push campaigns.

## Backend priorities
1. Service modularization from route handlers (auth, activities, feed, events).
2. Queue-based async jobs for feed fanout, notifications, recap generation.
3. Strong idempotency for mobile writes and retry-safe endpoints.
4. Data quality and anti-cheat pipeline.

## Frontend priorities
1. Redesign onboarding and permission UX to improve trust and activation.
2. Live-run and post-run UX polish (clarity, haptics, confidence states).
3. Feed card hierarchy and map-first visual system.
4. Profile progression narrative (milestones, trends, consistency).

## Success metrics
- D1 activation: first tracked run completed.
- D7 retention: user returns and records at least 1 run.
- Weekly active runners.
- Avg runs per active user per week.
- Social actions per run (kudos/comments/follows).
- Event RSVP conversion rate.

## Risks to avoid
- Feature bloat before habit loop quality is solved.
- Weak privacy defaults for route/location data.
- Heavy backend complexity before observability and CI quality gates.
