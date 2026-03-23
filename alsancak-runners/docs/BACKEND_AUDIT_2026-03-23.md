# Backend Audit Report (2026-03-23)

## Scope
This review covers the backend implemented in `alsancak-runners/src/app/api`, shared backend libraries in `alsancak-runners/src/lib`, and the DB schema in `alsancak-runners/src/db/schema`.

## High-level findings
- **Strengths:** clear domain-oriented schema design, useful indexing strategy, practical use of rate limiting and caching abstractions, generally consistent API route organization.
- **Major risks:** security posture around password reset and token lifecycle, fail-open controls, route-level business-logic sprawl, and concurrency issues around capacity/toggle operations.
- **Production readiness:** suitable for beta/small-scale production with trusted users; not yet hard enough for high-risk public production workloads.

## Notable confirmed issues
1. Password reset code is stored in process memory and returned in API response (dev behavior still present in API). This is insecure in production and non-scalable across instances.
2. Forgot-password returns 404 for unknown emails, allowing account enumeration.
3. Rate limiter and cache both fail open when Redis is unavailable; this leaves abuse controls disabled under failure.
4. `touchLastActive()` dynamic-imports `@/db` even though DB module is in `@/lib/db`; this appears to be a broken import path.
5. Event RSVP capacity checks are not transaction-protected, allowing race-condition oversubscription under concurrent requests.
6. Comment says event creation is admin/captain only, but route allows all authenticated users.
7. `cacheInvalidate(..., true)` uses Redis `KEYS`, which can cause latency spikes at scale.

## Recommended next actions
- Move reset flows to secure, persistent, hashed one-time tokens stored in DB/Redis and always return generic responses.
- Introduce refresh-token session persistence (rotation + revocation) for mobile auth.
- Move API route business logic into domain services; keep handlers thin.
- Add transactional guards for RSVP/kudos/follow toggles where consistency matters.
- Replace Redis `KEYS` with SCAN or key-tagged invalidation sets.
- Add structured logging, trace IDs, and production metrics around DB, cache, webhook processing, and auth flows.
