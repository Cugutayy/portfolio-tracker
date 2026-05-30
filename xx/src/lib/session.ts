import { auth } from "./auth";
import { db } from "./db";
import { users, type User } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Returns the signed-in user row, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}
