import NextAuth from "next-auth";

import { authConfig } from "./auth.config";

// Edge-safe NextAuth init (no Prisma adapter). The `authorized` callback in
// authConfig decides which routes require a session.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on all routes except the auth API, Next.js internals, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
