import Link from "next/link";

import {
  formatCompactUsd,
  formatPercent,
  formatShares,
  formatYesPrice,
} from "@/lib/format";
import styles from "./PositionsTable.module.scss";

type Numeric = number | string | { toString(): string } | null | undefined;

export interface PositionRow {
  key: string;
  /** Market question / title. */
  title: string;
  outcome: string | null;
  /** Shares held. */
  size: Numeric;
  /** Average entry price, 0..1. */
  avgPrice: Numeric;
  /** Current price, 0..1. */
  curPrice: Numeric;
  /** Cash P&L in USDC. */
  cashPnl: number;
  /** Cash P&L as a 0..1 fraction of cost basis; null when no cost basis. */
  pnlFraction: number | null;
  /** Link to our cached market detail page, when the market is in our DB. */
  marketHref: string | null;
}

export interface PositionsTableProps {
  positions: PositionRow[];
  emptyMessage?: string;
}

/** Per-position breakdown (spec §8: market, size, avg entry, current, P&L). */
export function PositionsTable({
  positions,
  emptyMessage = "No open positions for this address.",
}: PositionsTableProps) {
  if (positions.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.left}>Market</th>
            <th className={styles.left}>Outcome</th>
            <th className={styles.right}>Size</th>
            <th className={styles.right}>Avg entry</th>
            <th className={styles.right}>Current</th>
            <th className={styles.right}>P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.key}>
              <td className={styles.left}>
                {p.marketHref ? (
                  <Link className={styles.market} href={p.marketHref}>
                    {p.title}
                  </Link>
                ) : (
                  <span className={styles.market}>{p.title}</span>
                )}
              </td>
              <td className={styles.left}>
                <span className={styles.outcome}>{p.outcome ?? "—"}</span>
              </td>
              <td className={styles.right}>{formatShares(p.size)}</td>
              <td className={styles.right}>{formatYesPrice(p.avgPrice)}</td>
              <td className={styles.right}>{formatYesPrice(p.curPrice)}</td>
              <td className={styles.right}>
                <span className={p.cashPnl >= 0 ? styles.pos : styles.neg}>
                  {formatCompactUsd(p.cashPnl)}
                  {p.pnlFraction !== null ? (
                    <span className={styles.pct}>
                      {formatPercent(p.pnlFraction)}
                    </span>
                  ) : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
