import Link from "next/link";

import { auth } from "@/auth";
import { ThemeSelect } from "@/components/Theme/ThemeSelect";
import { prisma } from "@/lib/db/prisma";
import { formatCompactUsd, shortenAddress } from "@/lib/format";
import { PLAN_LIMITS, type Plan } from "@/lib/plan";
import { getUserSubscription } from "@/lib/subscription";
import {
  addAlert,
  createBillingPortalSession,
  createCheckoutSession,
  removeAlert,
  saveTelegramChatId,
  toggleAlert,
} from "./actions";
import styles from "./settings.module.scss";

// Subscription state is per-user and changes via Stripe webhooks — never cache.
export const dynamic = "force-dynamic";

const PRO_PRICE_LABEL = "€15 / month";
const MARKET_OPTIONS_LIMIT = 100;
const QUESTION_MAX = 70;

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

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const STATUS_MESSAGES: Record<string, { text: string; kind: "ok" | "info" }> = {
  success: {
    text: "Payment received — your Pro plan is now active. It may take a moment for the status below to update.",
    kind: "ok",
  },
  cancel: {
    text: "Checkout canceled — you can upgrade to Pro any time.",
    kind: "info",
  },
  "no-customer": {
    text: "No billing account yet — upgrade to Pro to manage a subscription.",
    kind: "info",
  },
  "alert-created": { text: "Alert created.", kind: "ok" },
  "telegram-saved": { text: "Telegram chat ID saved.", kind: "ok" },
};

const ERROR_MESSAGES: Record<string, string> = {
  "alerts-pro": "Alerts are a Pro feature — upgrade to create them.",
  "alert-invalid": "Couldn't create that alert — check the fields.",
  "alert-needs-market": "That alert type needs a market — pick one from the list.",
  "alert-needs-threshold":
    "Price-swing alerts need a swing size in percentage points.",
  "invalid-wallet": "That wallet address looks invalid.",
  "no-telegram":
    "Add your Telegram chat ID below before using the Telegram channel.",
  "invalid-chat-id": "Telegram chat ID must be a number.",
};

function Banner({
  status,
  error,
}: {
  status: string | undefined;
  error: string | undefined;
}) {
  if (error && ERROR_MESSAGES[error]) {
    return <p className={styles.bannerError}>{ERROR_MESSAGES[error]}</p>;
  }
  if (status && STATUS_MESSAGES[status]) {
    const { text, kind } = STATUS_MESSAGES[status];
    return (
      <p className={kind === "ok" ? styles.bannerSuccess : styles.bannerInfo}>
        {text}
      </p>
    );
  }
  return null;
}

const TYPE_LABELS: Record<string, string> = {
  whale_move: "Whale move",
  price_swing: "Price swing",
  market: "Market resolves",
};

type AlertRow = {
  id: string;
  type: string;
  channel: string;
  wallet: string | null;
  threshold: { toString(): string } | null;
  active: boolean;
  market: { question: string } | null;
};

/** Human-readable summary of an alert's scope. */
function describeAlert(a: AlertRow): string {
  const market = a.market ? truncate(a.market.question, QUESTION_MAX) : null;
  if (a.type === "whale_move") {
    const parts = ["Whale trades"];
    if (market) parts.push(`on “${market}”`);
    if (a.wallet) parts.push(`by ${shortenAddress(a.wallet)}`);
    if (a.threshold) parts.push(`≥ ${formatCompactUsd(a.threshold)}`);
    return parts.join(" ");
  }
  if (a.type === "price_swing") {
    const pp = a.threshold ? `${Number(a.threshold)}pp` : "a set move";
    return `YES price swings ≥ ${pp}${market ? ` on “${market}”` : ""}`;
  }
  return `Resolves${market ? `: “${market}”` : ""}`;
}

function AlertsSection({
  isPro,
  alerts,
  markets,
  telegramChatId,
}: {
  isPro: boolean;
  alerts: AlertRow[];
  markets: { id: string; question: string }[];
  telegramChatId: string | null;
}) {
  if (!isPro) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Alerts</h2>
        <div className={styles.upsell}>
          <p className={styles.upsellText}>
            Get notified by email or Telegram when whales move, prices swing, or
            a market resolves. Alerts are a Pro feature.
          </p>
          <form action={createCheckoutSession}>
            <button type="submit" className={styles.upsellBtn}>
              Upgrade to Pro
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Alerts</h2>

      {alerts.length === 0 ? (
        <p className={styles.note}>No alerts yet — create one below.</p>
      ) : (
        <ul className={styles.alertList}>
          {alerts.map((a) => (
            <li key={a.id} className={styles.alertRow}>
              <div className={styles.alertInfo}>
                <span className={styles.alertTitle}>
                  {TYPE_LABELS[a.type] ?? a.type}
                  {!a.active ? <span className={styles.paused}> · paused</span> : null}
                </span>
                <span className={styles.alertDesc}>{describeAlert(a)}</span>
                <span className={styles.alertMeta}>via {a.channel}</span>
              </div>
              <div className={styles.alertActions}>
                <form action={toggleAlert}>
                  <input type="hidden" name="id" value={a.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={a.active ? "false" : "true"}
                  />
                  <button type="submit" className={styles.smallBtn}>
                    {a.active ? "Pause" : "Resume"}
                  </button>
                </form>
                <form action={removeAlert}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className={styles.smallBtn}>
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={addAlert} className={styles.alertForm}>
        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Type</span>
            <select name="type" className={styles.select} defaultValue="whale_move">
              <option value="whale_move">Whale move</option>
              <option value="price_swing">Price swing</option>
              <option value="market">Market resolves</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Channel</span>
            <select name="channel" className={styles.select} defaultValue="email">
              <option value="email">Email</option>
              <option value="telegram">Telegram</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Market</span>
            <select name="marketId" className={styles.select} defaultValue="">
              <option value="">Any market (whale only)</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {truncate(m.question, QUESTION_MAX)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Threshold</span>
            <input
              type="number"
              name="threshold"
              step="any"
              min="0"
              className={styles.input}
              placeholder="Min USD (whale) / pp (swing)"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Wallet (whale, optional)</span>
            <input
              type="text"
              name="wallet"
              className={styles.input}
              placeholder="0x…"
            />
          </label>
          <button type="submit" className={styles.addBtn}>
            Create alert
          </button>
        </div>
        <p className={styles.note}>
          Whale move: optional market, wallet, and min USD. Price swing: pick a
          market and a swing size in percentage points. Market resolves: pick a
          market. Telegram needs a chat ID saved below.
        </p>
      </form>

      <form action={saveTelegramChatId} className={styles.telegramForm}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Telegram chat ID</span>
          <input
            type="text"
            name="chatId"
            className={styles.input}
            defaultValue={telegramChatId ?? ""}
            placeholder="e.g. 123456789"
          />
        </label>
        <button type="submit" className={styles.smallBtn}>
          Save
        </button>
        <p className={styles.note}>
          Message your Telegram bot, then get your numeric chat ID (e.g. via{" "}
          <span className={styles.code}>@userinfobot</span>). Leave empty to clear.
        </p>
      </form>
    </section>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const session = await auth();
  const userId = session?.user?.id;
  // The (app) layout already gates this route; this satisfies the type checker.
  if (!userId) return null;

  const [sub, walletCount, user, alerts, markets] = await Promise.all([
    getUserSubscription(userId),
    prisma.trackedWallet.count({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    }),
    prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { market: { select: { question: true } } },
    }),
    prisma.market.findMany({
      where: { closed: false },
      orderBy: { volume: "desc" },
      take: MARKET_OPTIONS_LIMIT,
      select: { id: true, question: true },
    }),
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

      <Banner status={status} error={error} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.appearanceRow}>
          <p className={styles.note}>Choose how EdgeBoard looks.</p>
          <ThemeSelect />
        </div>
      </section>

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
            Upgrade for unlimited tracked wallets, full price history, the
            extended whale feed, and alerts.
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
              {limits.alerts
                ? `${alerts.length} / ${formatLimit(limits.alertsLimit)}`
                : "Pro only"}
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

      <AlertsSection
        isPro={isPro}
        alerts={alerts}
        markets={markets}
        telegramChatId={user?.telegramChatId ?? null}
      />
    </section>
  );
}
