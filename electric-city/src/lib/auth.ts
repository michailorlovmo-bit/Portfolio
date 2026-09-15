import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isLoginLocked, recordLoginFailure, recordLoginSuccess } from "@/lib/loginRateLimit";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Checked before touching the database, and failures/successes are
        // never distinguished in the response — a locked-out attempt looks
        // identical to a wrong password, so this can't be used as an oracle
        // to enumerate which accounts exist or are currently locked.
        if (isLoginLocked(email)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) {
          recordLoginFailure(email);
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          recordLoginFailure(email);
          return null;
        }

        recordLoginSuccess(email);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as "MANAGER" | "STAFF",
          canViewStats: user.canViewStats,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.canViewStats = user.canViewStats;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.canViewStats = token.canViewStats;
      }
      return session;
    },
  },
};
