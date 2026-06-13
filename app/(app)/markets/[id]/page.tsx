import Link from "next/link";
import { notFound } from "next/navigation";

import { PriceChart } from "@/components/PriceChart/PriceChart";
import type { WhalePoint } from "@/components/PriceChart/PriceChart";
import { TradesTable } from "@/components/TradesTable/TradesTable";
import { prisma } from "@/lib/db/prisma";
import { formatCompactUsd, formatYesPrice } from "@/lib/format";
import { historyCutoff, PLAN_LIMITS } from "@/lib/plan";
import { getCurrentPlan } from "@/lib/subscription";
import styles from "./market.module.scss";

// Always render fresh from the DB (data is updated by the ingestion crons).
export const dynamic = "force-dynamic";

const SNAPSHOT_LIMIT = 1000;
const TRADE_LIMIT = 50;

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [market, plan] = await Promise.all([
    prisma.market.findUnique({ where: { id } }),
    getCurrentPlan(),
  ]);
  if (!market) notFound();

  // Free plans see only the last 7 days of price history; Pro sees it all (§10).
  const cutoff = historyCutoff(plan);

  const [snapshotsDesc, trades] = await Promise.all([
    prisma.priceSnapshot.findMany({
      where: { marketId: id, ...(cutoff ? { ts: { gte: cutoff } } : {}) },
      orderBy: { ts: "desc" },
      take: SNAPSHOT_LIMIT,
      select: { ts: true, price: true },
    }),
    prisma.trade.findMany({
      where: { marketId: id, isWhale: true },
      orderBy: { ts: "desc" },
      take: TRADE_LIMIT,
      select: {
        id: true,
        wallet: true,
        side: true,
        sizeUsdc: true,
        price: true,
        outcome: true,
        ts: true,
      },
    }),
  ]);

  // Chart wants oldest-first; we queried newest-first for the "latest" price.
  const points = snapshotsDesc
    .map((s) => ({ ts: s.ts.getTime(), price: Number(s.price) }))
    .reverse();
  const whales: WhalePoint[] = trades.map((t) => ({
    ts: t.ts.getTime(),
    price: Number(t.price),
    side: t.side === "sell" ? "sell" : "buy",
  }));
  const latestYes = snapshotsDesc[0]?.price ?? null;

  return (
    <section className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/markets" className={styles.back}>
          ← Markets
        </Link>
      </div>

      <header className={styles.head}>
        {market.category ? (
          <span className={styles.category}>{market.category}</span>
        ) : null}
        <h1 className={styles.title}>{market.question}</h1>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>YES</span>
            <span className={styles.statValue}>{formatYesPrice(latestYes)}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Volume</span>
            <span className={styles.statValue}>
              {formatCompactUsd(market.volume)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Liquidity</span>
            <span className={styles.statValue}>
              {formatCompactUsd(market.liquidity)}
            </span>
          </div>
        </div>
      </header>

      <PriceChart points={points} whales={whales} />

      {cutoff ? (
        <p className={styles.historyNote}>
          Showing the last {PLAN_LIMITS.free.historyDays} days of price history.{" "}
          <Link href="/settings" className={styles.historyLink}>
            Upgrade to Pro
          </Link>{" "}
          for the full history.
        </p>
      ) : null}

      <section className={styles.tradesSection}>
        <h2 className={styles.sectionTitle}>Recent large trades</h2>
        <TradesTable
          trades={trades}
          emptyMessage="No whale trades yet — run the sync-trades cron to ingest large trades from Polymarket."
        />
      </section>
    </section>
  );
}
