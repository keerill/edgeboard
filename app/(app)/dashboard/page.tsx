import Link from "next/link";
import { CloudOff, Wallet } from "lucide-react";

import { auth } from "@/auth";
import { ContextBar } from "@/components/Shell/ContextBar";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { FilterPills } from "@/components/Filters/FilterPills";
import { FilterProvider } from "@/components/Filters/FilterProvider";
import { PendingRegion } from "@/components/Filters/PendingRegion";
import { SubmitButton } from "@/components/SubmitButton/SubmitButton";
import { Donut } from "@/components/data/Donut";
import { StatCard } from "@/components/data/StatCard";
import { StatStrip } from "@/components/data/StatStrip";
import { PortfolioSummary } from "@/components/PortfolioSummary/PortfolioSummary";
import {
  PositionsTable,
  type PositionRow,
} from "@/components/PositionsTable/PositionsTable";
import { summarizePortfolio } from "@/lib/analytics/portfolio";
import { prisma } from "@/lib/db/prisma";
import { shortenAddress } from "@/lib/format";
import { canAddWallet } from "@/lib/plan";
import { getPortfolioValue, getPositionsResult } from "@/lib/polymarket";
import { getPlatformStatCards } from "@/lib/stats";
import { getUserSubscription } from "@/lib/subscription";
import { addTrackedWallet, removeTrackedWallet } from "./actions";
import styles from "./dashboard.module.scss";

// Portfolio is per-user and reads the live Data API — never cache.
export const dynamic = "force-dynamic";

/** Coerce a loose Data API value to a finite number (0 on garbage). */
function num(value: unknown): number {
  const n = Number(String(value));
  return Number.isFinite(n) ? n : 0;
}

function AddWalletForm({ invalid }: { invalid: boolean }) {
  return (
    <form className={styles.addForm} action={addTrackedWallet}>
      <input
        className={styles.input}
        type="text"
        name="address"
        placeholder="0x… public wallet address"
        autoComplete="off"
        spellCheck={false}
        required
        aria-label="Wallet address"
      />
      <input
        className={styles.inputLabel}
        type="text"
        name="label"
        placeholder="Label (optional)"
        autoComplete="off"
        aria-label="Wallet label"
      />
      <SubmitButton className={styles.addBtn} pendingText="Adding…">
        Add wallet
      </SubmitButton>
      {invalid ? (
        <p className={styles.error}>
          Enter a valid address: 0x followed by 40 hex characters.
        </p>
      ) : null}
    </form>
  );
}

// Shown to Free users who already track their one allowed wallet (§10).
function WalletLimitNotice({ atLimitError }: { atLimitError: boolean }) {
  return (
    <div className={styles.upsell}>
      <p className={styles.upsellText}>
        {atLimitError
          ? "Free tracks a single wallet. Upgrade to Pro to track more."
          : "On Free you can track one wallet. Upgrade to Pro for unlimited wallets."}
      </p>
      <Link href="/settings" className={styles.upsellLink}>
        Upgrade to Pro
      </Link>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  // The (app) layout already gates this route; this satisfies the type checker.
  if (!userId) return null;

  const invalid = sp.error === "invalid-address";
  const limitError = sp.error === "wallet-limit";
  const [wallets, sub, statCards] = await Promise.all([
    prisma.trackedWallet.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    getUserSubscription(userId),
    getPlatformStatCards(),
  ]);
  const plan = sub?.plan === "pro" ? "pro" : "free";
  const canAdd = canAddWallet(plan, wallets.length);

  const statStrip = (
    <StatStrip>
      {statCards.map((c, i) => (
        <StatCard key={i} {...c} />
      ))}
    </StatStrip>
  );

  // Empty state: prompt to add the first wallet.
  if (wallets.length === 0) {
    return (
      <section className={styles.page}>
        <ContextBar eyebrow="Smart money" title="Portfolio" />
        {statStrip}
        <EmptyState
          icon={Wallet}
          title="Track your first wallet"
          description="Paste any public Polymarket wallet address to see its positions, P&L and win rate — no wallet connection needed."
          action={<AddWalletForm invalid={invalid} />}
          hint="Tip: paste any public 0x address — even a known whale's."
        />
      </section>
    );
  }

  // Selected wallet: ?wallet= if it belongs to the user, else the first one.
  const requested =
    typeof sp.wallet === "string" ? sp.wallet.toLowerCase() : undefined;
  const selected =
    wallets.find((w) => w.address === requested) ?? wallets[0];

  const [positionsResult, value] = await Promise.all([
    getPositionsResult(selected.address),
    getPortfolioValue(selected.address),
  ]);
  const positions = positionsResult.positions;
  // Distinguish a genuine "no positions" from a Data API outage so we can show
  // a distinct state instead of an empty portfolio.
  const dataApiDown = !positionsResult.ok;

  const summary = summarizePortfolio(
    positions.map((p) => ({
      initialValue: num(p.initialValue),
      currentValue: num(p.currentValue),
      cashPnl: num(p.cashPnl),
    })),
  );
  // /value is the authoritative total when present; otherwise sum positions.
  const totalValue = value ?? summary.totalValue;

  // Link positions to our cached market pages where we have them.
  const conditionIds = positions
    .map((p) => p.conditionId)
    .filter((c): c is string => Boolean(c));
  const cachedMarkets = conditionIds.length
    ? await prisma.market.findMany({
        where: { conditionId: { in: conditionIds } },
        select: { id: true, conditionId: true },
      })
    : [];
  const marketByCondition = new Map(
    cachedMarkets.map((m) => [m.conditionId, m.id]),
  );

  const rows: PositionRow[] = positions.map((p, i) => {
    const initialValue = num(p.initialValue);
    const cashPnl = num(p.cashPnl);
    const marketId = p.conditionId
      ? marketByCondition.get(p.conditionId)
      : undefined;
    return {
      key: p.asset ?? `${i}`,
      title: p.title ?? "Unknown market",
      outcome: p.outcome ?? null,
      size: p.size ?? null,
      avgPrice: p.avgPrice ?? null,
      curPrice: p.curPrice ?? null,
      cashPnl,
      pnlFraction: initialValue > 0 ? cashPnl / initialValue : null,
      marketHref: marketId ? `/markets/${marketId}` : null,
    };
  });

  // Allocation by current value → top 5 positions + "Other".
  const compositionAll = positions
    .map((p) => ({ label: p.title ?? "—", value: num(p.currentValue) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const restVal = compositionAll.slice(5).reduce((s, d) => s + d.value, 0);
  const composition =
    restVal > 0
      ? [...compositionAll.slice(0, 5), { label: "Other", value: restVal }]
      : compositionAll.slice(0, 5);

  const walletBar = (
    <div className={styles.walletBar}>
      <FilterPills
        param="wallet"
        mono
        ariaLabel="Select tracked wallet"
        active={selected.address}
        defaultValue={wallets[0].address}
        options={wallets.map((w) => ({
          value: w.address,
          label: w.label ?? shortenAddress(w.address),
        }))}
      />
      <form action={removeTrackedWallet}>
        <input type="hidden" name="id" value={selected.id} />
        <SubmitButton className={styles.removeBtn} pendingText="Removing…">
          Remove
        </SubmitButton>
      </form>
    </div>
  );

  return (
    <FilterProvider>
      <section className={styles.page}>
        <ContextBar eyebrow="Smart money" title="Portfolio">
          {walletBar}
        </ContextBar>

        {statStrip}

        <p className={styles.viewing}>
          Viewing{" "}
          <a
            className={styles.address}
            href={`https://polymarket.com/profile/${selected.address}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {shortenAddress(selected.address)}
          </a>
        </p>

        <PendingRegion>
          <PortfolioSummary
            totalValue={totalValue}
            totalCashPnl={summary.totalCashPnl}
            totalPercentPnl={summary.totalPercentPnl}
            winRate={summary.winRate}
            openPositions={summary.openPositions}
          />
        </PendingRegion>

        <PendingRegion>
          <div className="withRail">
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Positions</h2>
              {dataApiDown ? (
                <EmptyState
                  icon={CloudOff}
                  title="Live data unavailable"
                  description="We couldn't reach the Polymarket Data API just now. Your tracked wallets are saved — refresh in a moment to see positions and P&L."
                />
              ) : (
                <>
                  <PositionsTable
                    positions={rows}
                    emptyMessage="No open positions for this address."
                  />
                  <p className={styles.note}>
                    Value and P&amp;L are sourced from the Polymarket Data API.
                    Win rate is the share of positions currently in profit.
                  </p>
                </>
              )}
            </section>

            <aside className="rail">
              {composition.length > 0 ? (
                <div className={styles.panel}>
                  <h2 className={styles.sectionTitle}>Allocation</h2>
                  <Donut data={composition} />
                </div>
              ) : null}

              {canAdd ? (
                <div className={styles.panel}>
                  <h2 className={styles.sectionTitle}>Add a wallet</h2>
                  <AddWalletForm invalid={invalid} />
                </div>
              ) : (
                <WalletLimitNotice atLimitError={limitError} />
              )}
            </aside>
          </div>
        </PendingRegion>
      </section>
    </FilterProvider>
  );
}
