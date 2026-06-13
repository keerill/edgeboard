import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { PLAN_LIMITS, type Plan } from "@/lib/plan";
import { getUserSubscription } from "@/lib/subscription";
import { createBillingPortalSession, createCheckoutSession } from "./actions";
import styles from "./settings.module.scss";

// Subscription state is per-user and changes via Stripe webhooks — never cache.
export const dynamic = "force-dynamic";

const PRO_PRICE_LABEL = "€15 / month";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatLimit(value: number): string {
  return Number.isFinite(value) ? String(value) : "Unlimited";
}

function StatusBanner({ status }: { status: string | undefined }) {
  if (status === "success") {
    return (
      <p className={styles.bannerSuccess}>
        Payment received — your Pro plan is now active. It may take a moment for
        the status below to update.
      </p>
    );
  }
  if (status === "cancel") {
    return (
      <p className={styles.bannerInfo}>
        Checkout canceled — you can upgrade to Pro any time.
      </p>
    );
  }
  if (status === "no-customer") {
    return (
      <p className={styles.bannerInfo}>
        No billing account yet — upgrade to Pro to manage a subscription.
      </p>
    );
  }
  return null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;

  const session = await auth();
  const userId = session?.user?.id;
  // The (app) layout already gates this route; this satisfies the type checker.
  if (!userId) return null;

  const [sub, walletCount] = await Promise.all([
    getUserSubscription(userId),
    prisma.trackedWallet.count({ where: { userId } }),
  ]);

  const plan: Plan = sub?.plan === "pro" ? "pro" : "free";
  const limits = PLAN_LIMITS[plan];
  const isPro = plan === "pro";
  const periodEnd = sub?.currentPeriodEnd ?? null;
  const canceling = sub?.status === "canceled";

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your subscription and plan. Information only, not financial
          advice.
        </p>
      </header>

      <StatusBanner status={status} />

      <section className={styles.planCard}>
        <div className={styles.planRow}>
          <div className={styles.planName}>
            <span>Current plan</span>
            <span className={isPro ? styles.badgePro : styles.badgeFree}>
              {isPro ? "Pro" : "Free"}
            </span>
          </div>

          {isPro ? (
            <form action={createBillingPortalSession}>
              <button type="submit" className={styles.manageBtn}>
                Manage subscription
              </button>
            </form>
          ) : (
            <form action={createCheckoutSession}>
              <button type="submit" className={styles.upgradeBtn}>
                Upgrade to Pro — {PRO_PRICE_LABEL}
              </button>
            </form>
          )}
        </div>

        {isPro && periodEnd ? (
          <p className={styles.statusText}>
            {canceling
              ? `Access ends on ${formatDate(periodEnd)}.`
              : `Renews on ${formatDate(periodEnd)}.`}
          </p>
        ) : null}

        {!isPro ? (
          <p className={styles.statusText}>
            Upgrade for unlimited tracked wallets, full price history, and the
            extended whale feed.
          </p>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your plan limits</h2>
        <ul className={styles.limits}>
          <li className={styles.limitRow}>
            <span className={styles.limitLabel}>Tracked wallets</span>
            <span className={styles.limitValue}>
              {walletCount} / {formatLimit(limits.trackedWallets)}
            </span>
          </li>
          <li className={styles.limitRow}>
            <span className={styles.limitLabel}>Price history</span>
            <span className={styles.limitValue}>
              {Number.isFinite(limits.historyDays)
                ? `Last ${limits.historyDays} days`
                : "Full history"}
            </span>
          </li>
          <li className={styles.limitRow}>
            <span className={styles.limitLabel}>Whale feed</span>
            <span className={styles.limitValue}>
              {limits.whaleFeedLimit} trades
              {limits.whaleRanking ? " + ranking" : ""}
            </span>
          </li>
          <li className={styles.limitRow}>
            <span className={styles.limitLabel}>Alerts</span>
            <span className={styles.limitValue}>
              {limits.alerts ? "Included" : "Pro only (coming soon)"}
            </span>
          </li>
        </ul>
        <p className={styles.note}>
          Manage tracked wallets on your{" "}
          <Link href="/dashboard" className={styles.link}>
            dashboard
          </Link>
          .
        </p>
      </section>
    </section>
  );
}
