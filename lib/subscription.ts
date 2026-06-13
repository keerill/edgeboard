// Subscription IO helpers (spec §10). Bridges the DB/session to the pure plan
// logic in lib/plan.ts. Server-only: uses Prisma + auth(), so call from server
// components/actions (Node runtime), never from edge middleware.

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { Plan } from "@/lib/plan";

type Subscription = NonNullable<
  Awaited<ReturnType<typeof prisma.subscription.findUnique>>
>;

/** The user's subscription row, or null if none exists yet. */
export async function getUserSubscription(
  userId: string,
): Promise<Subscription | null> {
  return prisma.subscription.findUnique({ where: { userId } });
}

/**
 * The signed-in user's plan. Defaults to "free" when there's no session or no
 * subscription row, so gated pages fail closed (treat unknown as Free).
 */
export async function getCurrentPlan(): Promise<Plan> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return "free";

  const sub = await getUserSubscription(userId);
  return sub?.plan === "pro" ? "pro" : "free";
}
