import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUniqueHandle } from "@/lib/handle";

const schema = z.object({
  name: z.string().trim().min(2, "İsim en az 2 karakter").max(40),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta gir"),
  password: z.string().min(6, "Şifre en az 6 karakter").max(100),
});

export async function POST(req: Request) {
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

  const { name, email, password } = parsed.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "Bu e-posta zaten kayıtlı" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const handle = await generateUniqueHandle(name || email.split("@")[0]);

  await db.insert(users).values({ name, email, handle, passwordHash });

  return NextResponse.json({ ok: true });
}
