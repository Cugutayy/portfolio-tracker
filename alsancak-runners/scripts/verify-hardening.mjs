#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function contains(rel, pattern, msg) {
  const src = read(rel);
  assert(pattern.test(src), `${rel}: ${msg}`);
}

try {
  // 1) Password reset hardened + enumeration-safe response
  contains(
    'src/app/api/auth/forgot-password/route.ts',
    /message:\s*"Eger hesap mevcutsa sifre sifirlama kodu gonderildi"/,
    'missing generic non-enumerating forgot-password response',
  );
  contains(
    'src/app/api/auth/forgot-password/route.ts',
    /x-debug-reset-code/,
    'missing debug-header gate for optional reset code exposure',
  );
  contains(
    'src/app/api/auth/reset-password/route.ts',
    /passwordResetCodes/,
    'reset-password route is not using DB-backed reset codes',
  );
  contains(
    'src/app/api/auth/reset-password/route.ts',
    /attemptsRemaining/,
    'reset-password route is not tracking failed attempts',
  );

  // 2) Strict limiter fallback
  contains(
    'src/lib/rateLimit.ts',
    /strict\?:\s*boolean/,
    'strict flag missing in rate limiter config',
  );
  contains(
    'src/lib/rateLimit.ts',
    /strictInMemoryRateLimit/,
    'strict in-memory fallback missing',
  );
  contains(
    'src/lib/rateLimit.ts',
    /pruneStrictBuckets/,
    'strict bucket pruning missing',
  );

  // 3) RSVP transaction lock
  contains(
    'src/app/api/events/[slug]/rsvp/route.ts',
    /db\.transaction\(/,
    'RSVP route is not transactional',
  );
  contains(
    'src/app/api/events/[slug]/rsvp/route.ts',
    /FOR UPDATE/,
    'RSVP route missing row-level lock (FOR UPDATE)',
  );

  // 4) Event creation open to authenticated users
  const eventsRoute = read('src/app/api/events/route.ts');
  assert(!/Only captains can create events/.test(eventsRoute), 'events route still role-restricted');

  // 5) Activity/location safety defaults
  contains(
    'src/app/api/activities/route.ts',
    /privacy:\s*"members"/,
    'manual activity default privacy is not members',
  );
  contains(
    'src/app/api/community/activities/route.ts',
    /isLocationObfuscated/,
    'community activities response missing obfuscation flag',
  );

  // 6) Mobile auth import path fix
  contains(
    'src/lib/mobile-auth.ts',
    /import\("@\/lib\/db"\)/,
    'touchLastActive still uses incorrect DB import path',
  );

  // 7) Social groups backend (clubs) endpoints and schema
  contains(
    'src/db/schema/index.ts',
    /export const clubs = pgTable/,
    'clubs schema is missing',
  );
  contains(
    'src/db/schema/index.ts',
    /export const clubMembers = pgTable/,
    'clubMembers schema is missing',
  );
  contains(
    'src/app/api/clubs/route.ts',
    /export async function GET/,
    'clubs list endpoint is missing',
  );
  contains(
    'src/app/api/clubs/[id]/join/route.ts',
    /export async function POST/,
    'clubs join endpoint is missing',
  );

  // 8) Event operations must use strict rate limiting
  contains(
    'src/app/api/events/route.ts',
    /strict:\s*true/,
    'events route create rate limit is not strict',
  );
  contains(
    'src/app/api/events/[slug]/rsvp/route.ts',
    /strict:\s*true/,
    'event RSVP rate limit is not strict',
  );

  // 9) Onboarding progress schema must be backed by a migration
  contains(
    'src/db/schema/index.ts',
    /export const onboardingProgress = pgTable/,
    'onboarding progress schema is missing',
  );
  contains(
    'src/db/migrations/0005_onboarding_progress.sql',
    /CREATE TABLE IF NOT EXISTS "onboarding_progress"/,
    'onboarding progress migration is missing',
  );

  // 10) Onboarding analytics and progress APIs (Weeks 1-4 execution)
  contains(
    'src/app/api/onboarding/events/route.ts',
    /ALLOWED_EVENTS/,
    'onboarding events endpoint is missing allowed event validation',
  );
  contains(
    'src/app/api/onboarding/events/route.ts',
    /strict:\s*true/,
    'onboarding events endpoint is not strict-rate-limited',
  );
  contains(
    'src/app/api/onboarding/progress/route.ts',
    /completionPercent/,
    'onboarding progress endpoint missing completion response',
  );
  contains(
    'src/db/migrations/0006_onboarding_events.sql',
    /CREATE TABLE IF NOT EXISTS "onboarding_events"/,
    'onboarding events migration is missing',
  );

  // 11) Community feed should surface privacy education card for onboarding
  contains(
    'src/app/api/community/activities/route.ts',
    /educationCards/,
    'community activities response missing privacy education cards',
  );

  // 12) Feed model + ranking v1 + anti-spam controls (Weeks 5-8)
  contains(
    'src/db/schema/index.ts',
    /export const feedItems = pgTable/,
    'feed_items schema is missing',
  );
  contains(
    'src/app/api/feed/route.ts',
    /weights\.recency\s*\*\s*recency[\s\S]*weights\.relationship\s*\*\s*relationship[\s\S]*weights\.quality\s*\*\s*quality[\s\S]*weights\.diversity\s*\*\s*diversity/,
    'feed ranking formula v1 (weighted components) is missing',
  );
  contains(
    'src/app/api/feed/route.ts',
    /collapsedDuplicate/,
    'feed anti-spam duplicate collapse is missing',
  );
  contains(
    'src/db/migrations/0007_feed_items_and_club_goals.sql',
    /CREATE TABLE IF NOT EXISTS "feed_items"/,
    'feed_items migration is missing',
  );

  // 13) Club loops weekly goals + recap progress endpoint (Weeks 9-10)
  contains(
    'src/db/schema/index.ts',
    /export const clubWeeklyGoals = pgTable/,
    'club_weekly_goals schema is missing',
  );
  contains(
    'src/app/api/clubs/[id]/weekly-goal/route.ts',
    /completionPercent/,
    'club weekly-goal endpoint missing progress completion percent',
  );

  // 14) Weeks 11-12: cohort analytics + ranking weight iteration controls
  contains(
    'src/app/api/analytics/onboarding/route.ts',
    /d1ActivationRate/,
    'onboarding analytics endpoint missing D1 metric',
  );
  contains(
    'src/app/api/analytics/onboarding/route.ts',
    /d7RetentionRate/,
    'onboarding analytics endpoint missing D7 metric',
  );
  contains(
    'src/app/api/feed/route.ts',
    /FEED_RANK_WEIGHTS/,
    'feed ranking weight override support is missing',
  );

  console.log('✅ Hardening verification passed.');
} catch (err) {
  console.error('❌ Hardening verification failed:', err.message);
  process.exit(1);
}
