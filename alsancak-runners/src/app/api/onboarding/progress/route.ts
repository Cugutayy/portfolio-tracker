import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getRequestUser } from "@/lib/mobile-auth";
import { onboardingProgress } from "@/db/schema";

// GET /api/onboarding/progress
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [row] = await db
    .select({
      firstRunCompleted: onboardingProgress.firstRunCompleted,
      profileCompleted: onboardingProgress.profileCompleted,
      socialSeedCompleted: onboardingProgress.socialSeedCompleted,
      firstInteractionCompleted: onboardingProgress.firstInteractionCompleted,
      completedAt: onboardingProgress.completedAt,
      updatedAt: onboardingProgress.updatedAt,
    })
    .from(onboardingProgress)
    .where(eq(onboardingProgress.memberId, user.id))
    .limit(1);

  const progress = row || {
    firstRunCompleted: false,
    profileCompleted: false,
    socialSeedCompleted: false,
    firstInteractionCompleted: false,
    completedAt: null,
    updatedAt: null,
  };

  const completedMilestones = [
    progress.firstRunCompleted,
    progress.profileCompleted,
    progress.socialSeedCompleted,
    progress.firstInteractionCompleted,
  ].filter(Boolean).length;

  return NextResponse.json({
    progress,
    completedMilestones,
    totalMilestones: 4,
    completionPercent: Math.round((completedMilestones / 4) * 100),
  });
}
