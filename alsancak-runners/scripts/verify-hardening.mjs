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

  console.log('✅ Hardening verification passed.');
} catch (err) {
  console.error('❌ Hardening verification failed:', err.message);
  process.exit(1);
}
