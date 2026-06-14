import Link from "next/link";
import { Crown } from "lucide-react";

import { ContextBar } from "@/components/Shell/ContextBar";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { FilterPills } from "@/components/Filters/FilterPills";
import { FilterProvider } from "@/components/Filters/FilterProvider";
import { PendingRegion } from "@/components/Filters/PendingRegion";
import { StatCard } from "@/components/data/StatCard";
import { StatStrip } from "@/components/data/StatStrip";
import { Leaderboard } from "@/components/Leaderboard/Leaderboard";
import { SmartMoneyPanel } from "@/components/Leaderboard/SmartMoneyPanel";
import { WhaleTicker } from "@/components/marketing/WhaleTicker";
import { Reveal } from "@/components/motion/Reveal";
import { TradesTable } from "@/components/TradesTable/TradesTable";
import { PLAN_LIMITS } from "@/lib/plan";
import { getPlatformStatCards } from "@/lib/stats";
import { getCurrentPlan } from "@/lib/subscription";
import {
  getWhaleCategories,
  getWhaleFeed,
  getWhaleLeaderboard,
  WHALE_PERIODS,
  type WhalePeriod,
} from "@/lib/whales";
import styles from "./whales.module.scss";

// Always render fresh from the DB (data is updated by the ingestion crons).
export const dynamic = "force-dynamic";

export default async function WhalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const period: WhalePeriod = sp.period === "7d" ? "7d" : "24h";
  const category = typeof sp.category === "string" ? sp.category : undefined;

  // Free sees a shorter feed and no whale ranking; Pro gets the full set (§10).
  const plan = await getCurrentPlan();
  const limits = PLAN_LIMITS[plan];

  // Cached, filter-keyed reads (see lib/whales.ts). The leaderboard is
  // Pro-only and filter-independent, so it's computed only when shown.
  const [trades, categories, statCards] = await Promise.all([
    getWhaleFeed({ period, category, limit: limits.whaleFeedLimit }),
    getWhaleCategories(),
    getPlatformStatCards(),
  ]);
  const leaderRows = limits.whaleRanking ? await getWhaleLeaderboard() : [];

  const controls = (
    <div className={styles.controls}>
      <FilterPills
        label="Period"
        param="period"
        active={period}
        defaultValue="24h"
        options={(Object.keys(WHALE_PERIODS) as WhalePeriod[]).map((key) => ({
          value: key,
          label: key,
        }))}
      />

      {categories.length > 0 ? (
        <FilterPills
          label="Category"
          param="category"
          active={category ?? ""}
          defaultValue=""
          options={[
            { value: "", label: "All" },
            ...categories.map((cat) => ({ value: cat, label: cat })),
          ]}
        />
      ) : null}
    </div>
  );

  return (
    <FilterProvider>
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
          <PendingRegion>
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
          </PendingRegion>
        </Reveal>

        {limits.whaleRanking && leaderRows.length > 0 ? (
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
    </FilterProvider>
  );
}
