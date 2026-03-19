import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { badges } from "@/db/schema";

export async function GET() {
  const all = await db.select().from(badges).orderBy(badges.category);
  return NextResponse.json({ badges: all });
}
