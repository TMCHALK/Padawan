import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Auth.js configuration. Credentials provider with JWT sessions, which keeps
 * Prisma out of the edge runtime. The active organization id and role are baked
 * into the token at sign-in so server components can authorize without an extra
 * round-trip on every request.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { memberships: { take: 1, orderBy: { createdAt: "asc" } } },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        const membership = user.memberships[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: membership?.organizationId ?? null,
          role: membership?.role ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.organizationId = user.organizationId ?? null;
        token.role = user.role ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      // token values are typed as `unknown` (JWT extends Record<string, unknown>);
      // the jwt callback above is the single writer of these fields.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.organizationId =
          (token.organizationId as string | null) ?? null;
        session.user.role = (token.role as Role | null) ?? null;
      }
      return session;
    },
  },
});
