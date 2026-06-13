import Link from "next/link";

import { TradesTable } from "@/components/TradesTable/TradesTable";
import type { TradeRow } from "@/components/TradesTable/TradesTable";
import { prisma } from "@/lib/db/prisma";
import {
  formatCompactUsd,
  formatPercent,
  formatRelativeTime,
  shortenAddress,
} from "@/lib/format";
import { PLAN_LIMITS } from "@/lib/plan";
import { getCurrentPlan } from "@/lib/subscription";
import styles from "./whales.module.scss";

// Always render fresh from the DB (data is updated by the ingestion crons).
export const dynamic = "force-dynamic";

const RANKING_LIMIT = 20;
const PERIODS = { "24h": "24h", "7d": "7d" } as const;
type Period = keyof typeof PERIODS;
const PERIOD_MS: Record<Period, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

function buildHref(params: { period?: Period; category?: string }): string {
  const qs = new URLSearchParams();
  if (params.period && params.period !== "24h") qs.set("period", params.period);
  if (params.category) qs.set("category", params.category);
  const s = qs.toString();
  return s ? `/whales?${s}` : "/whales";
}

export default async function WhalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const period: Period = sp.period === "7d" ? "7d" : "24h";
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const cutoff = new Date(Date.now() - PERIOD_MS[period]);

  // Free sees a shorter feed and no whale ranking; Pro gets the full set (§10).
  const plan = await getCurrentPlan();
  const limits = PLAN_LIMITS[plan];

  const [feed, ranking, categoryRows] = await Promise.all([
    prisma.trade.findMany({
      where: {
        isWhale: true,
        ts: { gte: cutoff },
        ...(category ? { market: { category } } : {}),
      },
      orderBy: { sizeUsdc: "desc" },
      take: limits.whaleFeedLimit,
      select: {
        id: true,
        wallet: true,
        side: true,
        sizeUsdc: true,
        price: true,
        outcome: true,
        ts: true,
        market: { select: { id: true, question: true } },
      },
    }),
    prisma.whaleWallet.findMany({
      orderBy: { totalVolumeUsdc: "desc" },
      take: RANKING_LIMIT,
    }),
    prisma.market.findMany({
      where: { closed: false, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  const trades: TradeRow[] = feed.map((t) => ({
    id: t.id,
    wallet: t.wallet,
    side: t.side,
    sizeUsdc: t.sizeUsdc,
    price: t.price,
    outcome: t.outcome,
    ts: t.ts,
    market: t.market,
  }));

  const categories = categoryRows
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c));

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Whale moves</h1>
        <p className={styles.subtitle}>
          The largest taker trades across tracked markets. Information only, not
          financial advice.
        </p>
      </header>

      <div className={styles.controls}>
        <div className={styles.group}>
          <span className={styles.controlLabel}>Period</span>
          {(Object.keys(PERIODS) as Period[]).map((key) => (
            <Link
              key={key}
              href={buildHref({ period: key, category })}
              className={key === period ? styles.chipActive : styles.chip}
            >
              {key === "24h" ? "24h" : "7d"}
            </Link>
          ))}
        </div>

        {categories.length > 0 ? (
          <div className={styles.group}>
            <span className={styles.controlLabel}>Category</span>
            <Link
              href={buildHref({ period })}
              className={!category ? styles.chipActive : styles.chip}
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={buildHref({ period, category: cat })}
                className={cat === category ? styles.chipActive : styles.chip}
              >
                {cat}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Top trades</h2>
        <TradesTable
          trades={trades}
          showMarket
          emptyMessage="No whale trades in this window — run the sync-trades cron to ingest large trades from Polymarket."
        />
        {!limits.whaleRanking ? (
          <p className={styles.note}>
            Free shows the top {limits.whaleFeedLimit} trades.{" "}
            <Link href="/settings" className={styles.upsellLink}>
              Upgrade to Pro
            </Link>{" "}
            for the full feed.
          </p>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Top whales by volume</h2>
        {!limits.whaleRanking ? (
          <div className={styles.upsell}>
            <p className={styles.upsellText}>
              The whale leaderboard — ranked by volume, estimated P&amp;L and win
              rate — is a Pro feature.
            </p>
            <Link href="/settings" className={styles.upsellLink}>
              Upgrade to Pro
            </Link>
          </div>
        ) : ranking.length === 0 ? (
          <p className={styles.empty}>
            No whale wallets yet — run the aggregate-whales cron.
          </p>
        ) : (
          <ol className={styles.ranking}>
            {ranking.map((w, i) => (
              <li key={w.address} className={styles.rankRow}>
                <span className={styles.rank}>{i + 1}</span>
                <a
                  className={styles.rankWallet}
                  href={`https://polymarket.com/profile/${w.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {shortenAddress(w.address)}
                </a>
                <span className={styles.rankStat}>
                  <span className={styles.rankLabel}>Volume</span>
                  {formatCompactUsd(w.totalVolumeUsdc)}
                </span>
                <span className={styles.rankStat}>
                  <span className={styles.rankLabel}>Est. P&L</span>
                  {formatCompactUsd(w.realizedPnl)}
                </span>
                <span className={styles.rankStat}>
                  <span className={styles.rankLabel}>Win rate</span>
                  {formatPercent(w.winRate)}
                </span>
                <span className={styles.rankStat}>
                  <span className={styles.rankLabel}>Active</span>
                  {w.lastActive ? formatRelativeTime(w.lastActive) : "—"}
                </span>
              </li>
            ))}
          </ol>
        )}
        {limits.whaleRanking ? (
          <p className={styles.note}>
            Est. P&amp;L and win rate are FIFO estimates from ingested whale
            trades, not a full ledger.
          </p>
        ) : null}
      </section>
    </section>
  );
}
