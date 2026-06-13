// Plan limits + pure gating helpers (spec §10). No Prisma/IO here so this stays
// unit-testable — the DB/session lookups live in lib/subscription.ts.
//
// Free:  1 tracked wallet, last 7 days of price history, short whale feed, no
//        whale ranking, no alerts.
// Pro:   unlimited wallets, full history, full whale feed + ranking, alerts.

export type Plan = "free" | "pro";

export interface PlanLimits {
  /** Max tracked wallets a user may save (Infinity = unlimited). */
  trackedWallets: number;
  /** Days of market price history shown (Infinity = full history). */
  historyDays: number;
  /** Max rows in the whale "Top trades" feed. */
  whaleFeedLimit: number;
  /** Whether the "Top whales by volume" ranking is shown. */
  whaleRanking: boolean;
  /** Whether alerts are available (wired up in Phase 7). */
  alerts: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    trackedWallets: 1,
    historyDays: 7,
    whaleFeedLimit: 15,
    whaleRanking: false,
    alerts: false,
  },
  pro: {
    trackedWallets: Number.POSITIVE_INFINITY,
    historyDays: Number.POSITIVE_INFINITY,
    whaleFeedLimit: 50,
    whaleRanking: true,
    alerts: true,
  },
};

/** Pro-plan check (used for feature gating). */
export function isPro(plan: Plan): boolean {
  return plan === "pro";
}

/** Whether a user on `plan` may add another wallet given how many they have. */
export function canAddWallet(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].trackedWallets;
}

/**
 * Oldest timestamp of price history visible on `plan`. Returns null for plans
 * with full history (Pro) — callers then omit the time filter entirely.
 */
export function historyCutoff(plan: Plan, now: Date = new Date()): Date | null {
  const { historyDays } = PLAN_LIMITS[plan];
  if (!Number.isFinite(historyDays)) return null;
  return new Date(now.getTime() - historyDays * 24 * 60 * 60 * 1000);
}
