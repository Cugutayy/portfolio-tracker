import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Strava from "next-auth/providers/strava";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { members, stravaConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptTokenPair } from "./crypto";
import { isStravaConfigured } from "./env";

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
    // Strava OAuth — built-in provider with correct URLs + token_endpoint_auth_method
    ...(isStravaConfigured()
      ? [
          Strava({
            clientId: process.env.STRAVA_CLIENT_ID!,
            clientSecret: process.env.STRAVA_CLIENT_SECRET!,
            authorization: {
              params: {
                scope: "read,activity:read_all",
                approval_prompt: "auto",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Strava OAuth: look up or create member + encrypted strava_connection
      if (account?.provider === "strava" && account.access_token) {
        const athleteId = Number(user.id);

        const encrypted = encryptTokenPair(
          account.access_token,
          account.refresh_token!,
        );

        // Check if this Strava athlete is already linked
        const [existingConn] = await db
          .select({ memberId: stravaConnections.memberId })
          .from(stravaConnections)
          .where(eq(stravaConnections.stravaAthleteId, athleteId))
          .limit(1);

        if (existingConn) {
          // Returning user — update tokens, reuse member
          await db
            .update(stravaConnections)
            .set({
              ...encrypted,
              tokenExpiresAt: account.expires_at!,
              updatedAt: new Date(),
            })
            .where(eq(stravaConnections.stravaAthleteId, athleteId));
          user.id = existingConn.memberId;
        } else {
          // New user via Strava — create member + connection
          const [newMember] = await db
            .insert(members)
            .values({
              name: user.name || "Runner",
              // Strava doesn't expose email — use placeholder
              email: `strava_${athleteId}@placeholder.local`,
              image: user.image,
              role: "member",
              privacy: "private",
            })
            .returning({ id: members.id });

          await db.insert(stravaConnections).values({
            memberId: newMember.id,
            stravaAthleteId: athleteId,
            ...encrypted,
            tokenExpiresAt: account.expires_at!,
            scopes: "read,activity:read_all",
          });

          user.id = newMember.id;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }
      // Only query role on sign-in or explicit update — not every request
      if (
        token.id &&
        (!token.role || trigger === "signIn" || trigger === "update")
      ) {
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
