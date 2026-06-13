import { formatCompactUsd, formatPercent } from "@/lib/format";
import styles from "./PortfolioSummary.module.scss";

export interface PortfolioSummaryProps {
  /** Headline portfolio value (Data API /value, or summed positions). */
  totalValue: number;
  totalCashPnl: number;
  /** 0..1 fraction; null when there is no cost basis. */
  totalPercentPnl: number | null;
  /** 0..1 fraction; null when nothing is decided. */
  winRate: number | null;
  openPositions: number;
}

/** Sign → P&L color class (green up / red down / neutral at zero). */
function pnlClass(value: number | null): string {
  if (value === null || value === 0) return styles.value;
  return value > 0 ? styles.pos : styles.neg;
}

/** Top-of-dashboard summary cards (spec §8: value, P&L cash + %, win rate, count). */
export function PortfolioSummary({
  totalValue,
  totalCashPnl,
  totalPercentPnl,
  winRate,
  openPositions,
}: PortfolioSummaryProps) {
  return (
    <dl className={styles.grid}>
      <div className={styles.card}>
        <dt className={styles.label}>Total value</dt>
        <dd className={styles.value}>{formatCompactUsd(totalValue)}</dd>
      </div>
      <div className={styles.card}>
        <dt className={styles.label}>Cash P&amp;L</dt>
        <dd className={pnlClass(totalCashPnl)}>
          {formatCompactUsd(totalCashPnl)}
        </dd>
      </div>
      <div className={styles.card}>
        <dt className={styles.label}>P&amp;L %</dt>
        <dd className={pnlClass(totalPercentPnl)}>
          {formatPercent(totalPercentPnl)}
        </dd>
      </div>
      <div className={styles.card}>
        <dt className={styles.label}>Win rate</dt>
        <dd className={styles.value}>{formatPercent(winRate)}</dd>
      </div>
      <div className={styles.card}>
        <dt className={styles.label}>Open positions</dt>
        <dd className={styles.value}>{openPositions}</dd>
      </div>
    </dl>
  );
}
