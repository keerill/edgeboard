import Link from "next/link";
import { Activity, ArrowLeft, Crown, ExternalLink, Target, Waves } from "lucide-react";

import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Identicon } from "@/components/Identicon/Identicon";
import { Donut } from "@/components/data/Donut";
import { StatCard } from "@/components/data/StatCard";
import { StatStrip } from "@/components/data/StatStrip";
import { TradesTable, type TradeRow } from "@/components/TradesTable/TradesTable";
import { prisma } from "@/lib/db/prisma";
import { formatRelativeTime, shortenAddress } from "@/lib/format";
import styles from "./whale.module.scss";

// Per-wallet deep dive. Reuses the precomputed WhaleWallet aggregates + the
// ingested trade feed — no new backend. Always render fresh.
export const dynamic = "force-dynamic";

const FEED_LIMIT = 50;

export default async function WhaleDetailPage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet: raw } = await params;
  const wallet = raw.toLowerCase();

  const [whale, feed, count, byMarket] = await Promise.all([
    prisma.whaleWallet.findUnique({ where: { address: wallet } }),
    prisma.trade.findMany({
      where: { wallet, isWhale: true },
      orderBy: { ts: "desc" },
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
    prisma.trade.count({ where: { wallet, isWhale: true } }),
    prisma.trade.groupBy({
      by: ["marketId"],
      where: { wallet, isWhale: true },
      _sum: { sizeUsdc: true },
    }),
  ]);

  // Unknown wallet (never ingested as a whale) → friendly empty state.
  if (!whale && feed.length === 0) {
    return (
      <section className={styles.page}>
        <div className={styles.breadcrumb}>
          <Link href="/whales" className={styles.back}>
            <ArrowLeft size={14} />
            Whales
          </Link>
        </div>
        <EmptyState
          icon={Crown}
          title="No whale trades on record"
          description={`We have no whale-sized trades for ${shortenAddress(
            wallet,
          )} yet. The feed fills in as the ingestion crons run.`}
        />
      </section>
    );
  }

  // Volume-by-category breakdown for the Donut (top 6 + "Other").
  const marketIds = byMarket
    .map((r) => r.marketId)
    .filter((id): id is string => Boolean(id));
  const markets = marketIds.length
    ? await prisma.market.findMany({
        where: { id: { in: marketIds } },
        select: { id: true, category: true },
      })
    : [];
  const catOf = new Map(markets.map((m) => [m.id, m.category]));
  const catTotals = new Map<string, number>();
  for (const r of byMarket) {
    const cat = (r.marketId && catOf.get(r.marketId)) || "Other";
    catTotals.set(cat, (catTotals.get(cat) ?? 0) + Number(r._sum.sizeUsdc ?? 0));
  }
  const categoryAll = [...catTotals.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const restCat = categoryAll.slice(6).reduce((s, d) => s + d.value, 0);
  const categoryData =
    restCat > 0
      ? [...categoryAll.slice(0, 6), { label: "Other", value: restCat }]
      : categoryAll.slice(0, 6);

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

  const totalVolume = Number(whale?.totalVolumeUsdc ?? 0);
  const realizedPnl = Number(whale?.realizedPnl ?? 0);
  const winRate = whale?.winRate != null ? Number(whale.winRate) : null;
  const lastActive = whale?.lastActive ?? feed[0]?.ts ?? null;
  const winPct = winRate != null ? Math.max(0, Math.min(100, winRate * 100)) : 0;

  return (
    <section className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/whales" className={styles.back}>
          <ArrowLeft size={14} />
          Whales
        </Link>
      </div>

      <header className={styles.head}>
        <Identicon address={wallet} size={44} />
        <div className={styles.headText}>
          <h1 className={styles.title}>{shortenAddress(wallet)}</h1>
          <a
            className={styles.profileLink}
            href={`https://polymarket.com/profile/${wallet}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Polymarket profile <ExternalLink size={13} />
          </a>
        </div>
        {lastActive ? (
          <span className={styles.lastActive}>
            Active {formatRelativeTime(lastActive)}
          </span>
        ) : null}
      </header>

      <StatStrip>
        <StatCard
          label="Total volume"
          value={totalVolume}
          format="usd"
          icon={Waves}
        />
        <StatCard label="Est. realized P&L" value={realizedPnl} format="usd" />
        <StatCard
          label="Win rate"
          value={winRate ?? 0}
          format="percent"
          icon={Target}
        />
        <StatCard
          label="Whale trades"
          value={count}
          format="int"
          icon={Activity}
        />
      </StatStrip>

      <div className="withRail">
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent whale trades</h2>
          <TradesTable
            trades={trades}
            showMarket
            emptyMessage="No whale trades on record for this wallet."
          />
        </section>

        <aside className="rail">
          {categoryData.length > 0 ? (
            <div className={styles.panel}>
              <h2 className={styles.sectionTitle}>Volume by category</h2>
              <Donut data={categoryData} />
            </div>
          ) : null}

          {winRate != null ? (
            <div className={styles.panel}>
              <h2 className={styles.sectionTitle}>Win rate</h2>
              <div className={styles.winBar}>
                <span className={styles.winFill} style={{ width: `${winPct}%` }} />
              </div>
              <span className={styles.winVal}>
                {Math.round(winPct)}% of closed trades profitable (FIFO estimate)
              </span>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
