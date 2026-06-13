import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db/prisma";
import { authConfig } from "./auth.config";

// Full Auth.js config (Node runtime). Spreads the edge-safe authConfig and adds
// the Prisma adapter + the first-sign-in subscription hook.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // JWT sessions keep middleware edge-safe (no DB read needed to check auth).
  // The adapter is still used to persist users/accounts and email verification
  // tokens (required by the magic-link provider).
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  events: {
    // Fires once, when the adapter inserts a new user (i.e. first sign-in).
    // Spec §9: create a free subscription on first sign-in.
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: "free",
          status: "active",
        },
      });
    },
  },
});
