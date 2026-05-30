import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUniqueHandle } from "./handle";
import { isGoogleConfigured } from "./env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/join", error: "/join" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    ...(isGoogleConfigured()
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    // Google sign-in: find-or-create a user with a 1M TL starting balance.
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;
      try {
        const email = user.email.toLowerCase().trim();
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existing) {
          user.id = existing.id;
        } else {
          const handle = await generateUniqueHandle(
            user.name || email.split("@")[0],
          );
          const [created] = await db
            .insert(users)
            .values({
              name: user.name || "Trader",
              email,
              handle,
              image: user.image,
            })
            .returning({ id: users.id });
          user.id = created.id;
        }
        return true;
      } catch (err) {
        console.error("[auth] Google sign-in error:", err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
