import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  bio: z.string().trim().max(160).optional(),
  // data URL (resized client-side) or https URL; cap to keep rows small
  image: z.string().max(800_000).nullable().optional(),
});

// PATCH /api/profile { name?, bio?, image? }
export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" },
      { status: 400 },
    );

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.bio !== undefined) patch.bio = parsed.data.bio;
  if (parsed.data.image !== undefined) patch.image = parsed.data.image;

  if (parsed.data.image) {
    const ok =
      parsed.data.image.startsWith("data:image/") ||
      parsed.data.image.startsWith("https://");
    if (!ok)
      return NextResponse.json({ ok: false, error: "Geçersiz görsel" }, { status: 400 });
  }

  const [row] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, me.id))
    .returning();

  return NextResponse.json({
    ok: true,
    user: { name: row.name, handle: row.handle, bio: row.bio, image: row.image },
  });
}
