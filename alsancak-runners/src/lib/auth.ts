import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT-only sessions — no database adapter needed
  session: { strategy: "jwt" },
  pages: {
    signIn: "/join",
    error: "/join",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [member] = await db
          .select()
          .from(members)
          .where(eq(members.email, email.toLowerCase().trim()))
          .limit(1);

        if (!member || !member.passwordHash) return null;

        const isValid = await bcrypt.compare(password, member.passwordHash);
        if (!isValid) return null;

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          image: member.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }
      // Only query role on sign-in or explicit update — not every request
      if (token.id && (!token.role || trigger === "signIn" || trigger === "update")) {
        const [member] = await db
          .select({ role: members.role })
          .from(members)
          .where(eq(members.id, token.id as string))
          .limit(1);
        if (member) {
          token.role = member.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        (session as unknown as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
});
