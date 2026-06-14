import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Waves } from "lucide-react";

import { PriceChart } from "@/components/PriceChart/PriceChart";
import type { WhalePoint } from "@/components/PriceChart/PriceChart";
import { Donut } from "@/components/data/Donut";
import { StatCard } from "@/components/data/StatCard";
import { StatStrip } from "@/components/data/StatStrip";
import { TradesTable } from "@/components/TradesTable/TradesTable";
import { prisma } from "@/lib/db/prisma";
import { formatCompactUsd } from "@/lib/format";
import { historyCutoff, PLAN_LIMITS } from "@/lib/plan";
import { getCurrentPlan } from "@/lib/subscription";
import styles from "./market.module.scss";

// Always render fresh from the DB (data is updated by the ingestion crons).
export const dynamic = "force-dynamic";

const SNAPSHOT_LIMIT = 1000;
const TRADE_LIMIT = 50;
const DAY = 24 * 60 * 60 * 1000;

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

  const [snapshotsDesc, trades, whaleVolAgg] = await Promise.all([
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
    prisma.trade.aggregate({
      _sum: { sizeUsdc: true },
      where: { marketId: id, isWhale: true },
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

  // YES price series + 24h change for the KPI strip.
  const series = points.map((p) => p.price);
  const dayAgo = Date.now() - DAY;
  const recent = points.filter((p) => p.ts >= dayAgo);
  const yesDelta =
    recent.length >= 2
      ? recent[recent.length - 1].price - recent[0].price
      : null;

  // Whale dominance = all-time whale volume / market volume.
  const whaleVolume = Number(whaleVolAgg._sum.sizeUsdc ?? 0);
  const marketVolume = Number(market.volume ?? 0);
  const dominance = marketVolume > 0 ? whaleVolume / marketVolume : null;
  const dominanceData =
    marketVolume > 0 && whaleVolume > 0
      ? [
          { label: "Whale volume", value: Math.min(whaleVolume, marketVolume) },
          {
            label: "Other volume",
            value: Math.max(0, marketVolume - whaleVolume),
          },
        ]
      : [];

  return (
    <section className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/markets" className={styles.back}>
          <ArrowLeft size={14} />
          Markets
        </Link>
      </div>

      <header className={styles.head}>
        {market.category ? (
          <span className={styles.category}>{market.category}</span>
        ) : null}
        <h1 className={styles.title}>{market.question}</h1>
      </header>

      <StatStrip>
        <StatCard
          label="YES price"
          value={Number(latestYes ?? 0)}
          format="yes"
          delta={yesDelta}
          deltaLabel="24h"
          series={series}
        />
        <StatCard label="Volume" value={marketVolume} format="usd" />
        <StatCard
          label="Liquidity"
          value={Number(market.liquidity ?? 0)}
          format="usd"
        />
        <StatCard
          label="Whale dominance"
          value={dominance ?? 0}
          format="percent"
          icon={Waves}
        />
      </StatStrip>

      <div className="withRail">
        <div className={styles.chartCol}>
          <PriceChart points={points} whales={whales} />
          {cutoff ? (
            <p className={styles.historyNote}>
              Showing the last {PLAN_LIMITS.free.historyDays} days of price
              history.{" "}
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
        </div>

        <aside className="rail">
          {dominanceData.length > 0 ? (
            <div className={styles.panel}>
              <h2 className={styles.sectionTitle}>Whale dominance</h2>
              <Donut data={dominanceData} />
            </div>
          ) : null}

          <div className={styles.panel}>
            <h2 className={styles.sectionTitle}>Market</h2>
            <dl className={styles.meta}>
              <div className={styles.metaRow}>
                <dt className={styles.metaLabel}>Whale volume</dt>
                <dd className={styles.metaValue}>
                  {formatCompactUsd(whaleVolume)}
                </dd>
              </div>
              <div className={styles.metaRow}>
                <dt className={styles.metaLabel}>Large trades</dt>
                <dd className={styles.metaValue}>{trades.length}</dd>
              </div>
              {market.endDate ? (
                <div className={styles.metaRow}>
                  <dt className={styles.metaLabel}>Resolves</dt>
                  <dd className={styles.metaValue}>
                    {market.endDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
