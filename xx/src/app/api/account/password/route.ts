import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre gerekli"),
  newPassword: z.string().min(6, "Yeni şifre en az 6 karakter").max(100),
});

// POST /api/account/password — change the SIGNED-IN user's own password.
// Account isolation: the target id comes only from the session, never the
// request body, so no one can change another user's password.
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  if (!me.passwordHash) {
    return NextResponse.json(
      { error: "Bu hesapta şifre tanımlı değil." },
      { status: 400 },
    );
  }

  const ok = await bcrypt.compare(currentPassword, me.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Mevcut şifre yanlış." }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Yeni şifre eskisiyle aynı olamaz." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, me.id));

  return NextResponse.json({ ok: true });
}
