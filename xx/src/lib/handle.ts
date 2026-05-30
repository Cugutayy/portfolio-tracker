import { db } from "./db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const TR_MAP: Record<string, string> = {
  ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g",
  ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c",
};

/** Slugify a name/email into a base handle (lowercase, alnum + underscore). */
export function slugifyHandle(input: string): string {
  const base = input
    .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (c) => TR_MAP[c] ?? c) // Turkish letters → ASCII
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip remaining diacritics
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return base || "trader";
}

/** Generate a handle that doesn't collide with an existing user. */
export async function generateUniqueHandle(seed: string): Promise<string> {
  const base = slugifyHandle(seed);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}${i}`;
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.handle, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return `${base}_${Date.now().toString(36)}`;
}
