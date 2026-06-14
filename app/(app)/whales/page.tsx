import Link from "next/link";
import { Crown } from "lucide-react";

import { ContextBar } from "@/components/Shell/ContextBar";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { StatCard } from "@/components/data/StatCard";
import { StatStrip } from "@/components/data/StatStrip";
import { Leaderboard, type LeaderRow } from "@/components/Leaderboard/Leaderboard";
import { SmartMoneyPanel } from "@/components/Leaderboard/SmartMoneyPanel";
import { WhaleTicker } from "@/components/marketing/WhaleTicker";
import { Reveal } from "@/components/motion/Reveal";
import { TradesTable } from "@/components/TradesTable/TradesTable";
import type { TradeRow } from "@/components/TradesTable/TradesTable";
import { prisma } from "@/lib/db/prisma";
import { PLAN_LIMITS } from "@/lib/plan";
import { getPlatformStatCards } from "@/lib/stats";
import { getCurrentPlan } from "@/lib/subscription";
import styles from "./whales.module.scss";

// Always render fresh from the DB (data is updated by the ingestion crons).
export const dynamic = "force-dynamic";

const RANKING_LIMIT = 20;
const DAY = 24 * 60 * 60 * 1000;
const PERIODS = { "24h": "24h", "7d": "7d" } as const;
type Period = keyof typeof PERIODS;
const PERIOD_MS: Record<Period, number> = {
  "24h": DAY,
  "7d": 7 * DAY,
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

  const [feed, ranking, categoryRows, statCards] = await Promise.all([
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
    getPlatformStatCards(),
  ]);

  // Per-wallet 24h-vs-7d volume → recent-activity share for the leaderboard.
  let leaderRows: LeaderRow[] = [];
  if (limits.whaleRanking && ranking.length) {
    const addrs = ranking.map((w) => w.address);
    const now = Date.now();
    const [v24, v7] = await Promise.all([
      prisma.trade.groupBy({
        by: ["wallet"],
        where: { isWhale: true, wallet: { in: addrs }, ts: { gte: new Date(now - DAY) } },
        _sum: { sizeUsdc: true },
      }),
      prisma.trade.groupBy({
        by: ["wallet"],
        where: { isWhale: true, wallet: { in: addrs }, ts: { gte: new Date(now - 7 * DAY) } },
        _sum: { sizeUsdc: true },
      }),
    ]);
    const m24 = new Map(v24.map((r) => [r.wallet, Number(r._sum.sizeUsdc ?? 0)]));
    const m7 = new Map(v7.map((r) => [r.wallet, Number(r._sum.sizeUsdc ?? 0)]));
    leaderRows = ranking.map((w, i) => {
      const s7 = m7.get(w.address) ?? 0;
      const s24 = m24.get(w.address) ?? 0;
      return {
        rank: i + 1,
        address: w.address,
        totalVolume: w.totalVolumeUsdc,
        volShare24h: s7 > 0 ? s24 / s7 : null,
        realizedPnl: w.realizedPnl,
        winRate: w.winRate,
        lastActive: w.lastActive,
      };
    });
  }

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

  const controls = (
    <div className={styles.controls}>
      <div className={styles.group}>
        <span className={styles.controlLabel}>Period</span>
        {(Object.keys(PERIODS) as Period[]).map((key) => (
          <Link
            key={key}
            href={buildHref({ period: key, category })}
            className={key === period ? styles.chipActive : styles.chip}
          >
            {key}
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
  );

  return (
    <section className={styles.page}>
      <ContextBar eyebrow="Smart money" title="Whale moves">
        {controls}
      </ContextBar>

      <WhaleTicker trades={trades} />

      <StatStrip>
        {statCards.map((c, i) => (
          <StatCard key={i} {...c} />
        ))}
      </StatStrip>

      <Reveal whenInView className={styles.section}>
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
      </Reveal>

      {limits.whaleRanking && ranking.length > 0 ? (
        <Reveal whenInView>
          <SmartMoneyPanel
            title="Smart-money leaderboard"
            subtitle="The wallets moving the most size — ranked by traded volume, with estimated P&L and win rate from ingested whale trades."
          >
            <Leaderboard rows={leaderRows} internalLinks />
            <p className={styles.note}>
              Est. P&amp;L and win rate are FIFO estimates from ingested whale
              trades, not a full ledger.
            </p>
          </SmartMoneyPanel>
        </Reveal>
      ) : !limits.whaleRanking ? (
        <EmptyState
          variant="pro"
          icon={Crown}
          title="Unlock the smart-money leaderboard"
          description="Rank every whale by volume, estimated P&L and win rate — and open any wallet's full trade history. A Pro feature."
          action={
            <Link href="/settings" className={styles.upsellLink}>
              Upgrade to Pro
            </Link>
          }
        />
      ) : (
        <EmptyState
          icon={Crown}
          title="No ranked whales yet"
          description="The leaderboard fills in once the aggregate-whales job has run."
        />
      )}
    </section>
  );
}
