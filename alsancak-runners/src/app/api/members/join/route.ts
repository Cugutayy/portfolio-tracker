import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, instagram, pace } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Check for existing member
    const [existing] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Bu email adresi zaten kayıtlı" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [member] = await db
      .insert(members)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        instagram: instagram?.trim() || null,
        paceGroup: pace || null,
      })
      .returning({
        id: members.id,
        name: members.name,
        email: members.email,
      });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Join error:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu, lütfen tekrar deneyin" },
      { status: 500 },
    );
  }
}
