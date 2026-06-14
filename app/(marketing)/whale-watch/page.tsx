import type { Metadata } from "next";
import Link from "next/link";

import { Crown } from "lucide-react";

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
import { getPlatformStatCards } from "@/lib/stats";
import styles from "./whale-watch.module.scss";

// Public marketing page: a free taste of the whale feed, no auth required.
// Always render fresh from the DB (data is updated by the ingestion crons).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live whale moves on Polymarket — EdgeBoard",
  description:
    "See the largest taker trades on Polymarket prediction markets in real time. A free preview of EdgeBoard's smart-money feed. Information only, not financial advice.",
};

// Public teaser limits (the full feed + leaderboard live behind sign-in).
const FEED_LIMIT = 12;
const RANKING_LIMIT = 5;

const PERIODS = ["24h", "7d"] as const;
type Period = (typeof PERIODS)[number];
const PERIOD_MS: Record<Period, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

function buildHref(period: Period): string {
  return period === "24h" ? "/whale-watch" : `/whale-watch?period=${period}`;
}

export default async function WhaleWatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const period: Period = sp.period === "7d" ? "7d" : "24h";
  const cutoff = new Date(Date.now() - PERIOD_MS[period]);

  const [feed, ranking, statCards] = await Promise.all([
    prisma.trade.findMany({
      where: { isWhale: true, ts: { gte: cutoff } },
      orderBy: { sizeUsdc: "desc" },
      take: FEED_LIMIT,
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
    getPlatformStatCards(),
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

  const leaderRows: LeaderRow[] = ranking.map((w, i) => ({
    rank: i + 1,
    address: w.address,
    totalVolume: w.totalVolumeUsdc,
    volShare24h: null,
    realizedPnl: w.realizedPnl,
    winRate: w.winRate,
    lastActive: w.lastActive,
  }));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Live whale moves</h1>
        <p className={styles.subtitle}>
          The largest taker trades across Polymarket prediction markets. A free
          preview — sign up for the full feed and your portfolio P&amp;L.
          Information only, not financial advice.
        </p>
      </header>

      <WhaleTicker trades={trades} />

      <StatStrip>
        {statCards.map((c, i) => (
          <StatCard key={i} {...c} />
        ))}
      </StatStrip>

      <div className={styles.controls}>
        <span className={styles.controlLabel}>Period</span>
        {PERIODS.map((key) => (
          <Link
            key={key}
            href={buildHref(key)}
            className={key === period ? styles.chipActive : styles.chip}
          >
            {key}
          </Link>
        ))}
      </div>

      <Reveal whenInView className={styles.section}>
        <h2 className={styles.sectionTitle}>Top trades</h2>
        <TradesTable
          trades={trades}
          showMarket
          linkMarkets={false}
          emptyMessage="No whale trades in this window yet — check back soon."
        />
      </Reveal>

      {ranking.length === 0 ? (
        <EmptyState
          icon={Crown}
          title="No ranked whales yet"
          description="The leaderboard fills in as whale trades are ingested — check back soon."
        />
      ) : (
        <Reveal whenInView>
          <SmartMoneyPanel
            title="Top smart-money wallets"
            subtitle="Ranked by traded volume across Polymarket prediction markets."
          >
            <Leaderboard rows={leaderRows} />
          </SmartMoneyPanel>
        </Reveal>
      )}

      <Reveal whenInView className={styles.cta}>
        <p className={styles.ctaText}>
          Want the full feed, the whale leaderboard with estimated P&amp;L, and
          your own portfolio in one place?
        </p>
        <Link href="/signin" className={styles.ctaButton}>
          Sign up free
        </Link>
      </Reveal>
    </div>
  );
}
