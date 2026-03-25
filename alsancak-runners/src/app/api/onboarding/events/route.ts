import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { onboardingEvents, onboardingProgress } from "@/db/schema";

const ALLOWED_EVENTS = new Set([
  "onboarding_screen_viewed",
  "onboarding_permission_prompted",
  "onboarding_permission_result",
  "privacy_education_viewed",
  "privacy_education_acknowledged",
  "first_run_saved",
  "profile_completed",
  "social_seed_completed",
  "first_interaction_completed",
]);

type ProgressPatch = {
  firstRunCompleted?: boolean;
  profileCompleted?: boolean;
  socialSeedCompleted?: boolean;
  firstInteractionCompleted?: boolean;
};

function eventToProgressPatch(eventName: string): ProgressPatch {
  if (eventName === "first_run_saved") return { firstRunCompleted: true };
  if (eventName === "profile_completed") return { profileCompleted: true };
  if (eventName === "social_seed_completed") return { socialSeedCompleted: true };
  if (eventName === "first_interaction_completed") return { firstInteractionCompleted: true };
  return {};
}

// POST /api/onboarding/events
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimited = await checkRateLimit(`onboarding:event:${user.id}`, {
    maxRequests: 120,
    windowSec: 60,
    failOpen: false,
  });
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventName =
    typeof (body as { eventName?: unknown })?.eventName === "string"
      ? (body as { eventName: string }).eventName.trim()
      : "";

  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ error: "Invalid onboarding event" }, { status: 400 });
  }

  const metadataRaw = (body as { metadata?: unknown })?.metadata;
  const metadata = metadataRaw && typeof metadataRaw === "object" ? metadataRaw : null;

  await db.insert(onboardingEvents).values({
    memberId: user.id,
    eventName,
    metadata,
  });

  const patch = eventToProgressPatch(eventName);
  if (Object.keys(patch).length > 0) {
    const [existing] = await db
      .select({
        id: onboardingProgress.id,
        firstRunCompleted: onboardingProgress.firstRunCompleted,
        profileCompleted: onboardingProgress.profileCompleted,
        socialSeedCompleted: onboardingProgress.socialSeedCompleted,
        firstInteractionCompleted: onboardingProgress.firstInteractionCompleted,
      })
      .from(onboardingProgress)
      .where(eq(onboardingProgress.memberId, user.id))
      .limit(1);

    if (!existing) {
      const state = {
        firstRunCompleted: patch.firstRunCompleted ?? false,
        profileCompleted: patch.profileCompleted ?? false,
        socialSeedCompleted: patch.socialSeedCompleted ?? false,
        firstInteractionCompleted: patch.firstInteractionCompleted ?? false,
      };
      const isDone =
        state.firstRunCompleted &&
        state.profileCompleted &&
        state.socialSeedCompleted &&
        state.firstInteractionCompleted;

      await db.insert(onboardingProgress).values({
        memberId: user.id,
        ...state,
        completedAt: isDone ? new Date() : null,
      });
    } else {
      const merged = {
        firstRunCompleted: existing.firstRunCompleted || !!patch.firstRunCompleted,
        profileCompleted: existing.profileCompleted || !!patch.profileCompleted,
        socialSeedCompleted: existing.socialSeedCompleted || !!patch.socialSeedCompleted,
        firstInteractionCompleted: existing.firstInteractionCompleted || !!patch.firstInteractionCompleted,
      };
      const isDone =
        merged.firstRunCompleted &&
        merged.profileCompleted &&
        merged.socialSeedCompleted &&
        merged.firstInteractionCompleted;

      await db
        .update(onboardingProgress)
        .set({
          ...merged,
          completedAt: isDone ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(eq(onboardingProgress.id, existing.id), eq(onboardingProgress.memberId, user.id)));
    }
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
