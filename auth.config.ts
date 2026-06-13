import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

// Edge-safe Auth.js config. NO database adapter / Prisma here — this object is
// imported by middleware.ts, which runs on the edge runtime where Prisma can't run.
// The full config (auth.ts) spreads this and adds the Prisma adapter.

// Route prefixes that require an authenticated session.
const PROTECTED_PREFIXES = ["/dashboard", "/markets", "/whales", "/settings"];

export const authConfig = {
  pages: {
    signIn: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    // Runs inside middleware (edge). Return false to redirect to pages.signIn.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        nextUrl.pathname.startsWith(prefix),
      );
      if (isProtected && !isLoggedIn) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
