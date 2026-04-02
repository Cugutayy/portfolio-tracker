import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports } from "@/db/schema";
import { getRequestUser } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rateLimit";

// POST /api/reports — report content or user
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rateLimited = await checkRateLimit(`report:${user.id}`, { maxRequests: 5, windowSec: 300 });
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const { targetType, targetId, reason, description } = body;

  const validTypes = ["post", "comment", "member", "message", "event", "group"];
  const validReasons = ["spam", "harassment", "inappropriate", "misinformation", "other"];

  if (!targetType || !validTypes.includes(targetType)) {
    return NextResponse.json({ error: `targetType must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ error: "targetId required" }, { status: 400 });
  }
  if (!reason || !validReasons.includes(reason)) {
    return NextResponse.json({ error: `reason must be one of: ${validReasons.join(", ")}` }, { status: 400 });
  }

  const [report] = await db.insert(reports).values({
    reporterId: user.id,
    targetType,
    targetId,
    reason,
    description: description?.trim()?.slice(0, 500) || null,
  }).returning({ id: reports.id });

  return NextResponse.json({
    success: true,
    reportId: report.id,
    message: "Raporunuz alindi. Inceleme sonrasi bilgilendirileceksiniz.",
  }, { status: 201 });
}
