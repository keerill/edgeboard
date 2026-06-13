import Link from "next/link";

import {
  formatCompactUsd,
  formatRelativeTime,
  formatYesPrice,
  shortenAddress,
} from "@/lib/format";
import styles from "./TradesTable.module.scss";

type Numeric = number | string | { toString(): string } | null | undefined;

export interface TradeRow {
  id: string;
  wallet: string;
  side: string;
  sizeUsdc: Numeric;
  price: Numeric;
  outcome: string | null;
  ts: Date;
  /** Present on the cross-market whale feed; omit on a single-market page. */
  market?: { id: string; question: string } | null;
}

export interface TradesTableProps {
  trades: TradeRow[];
  /** Render a Market column linking to each trade's market. */
  showMarket?: boolean;
  emptyMessage?: string;
}

export function TradesTable({
  trades,
  showMarket = false,
  emptyMessage = "No trades yet.",
}: TradesTableProps) {
  if (trades.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.left}>Wallet</th>
            <th className={styles.left}>Side</th>
            {showMarket ? <th className={styles.left}>Market</th> : null}
            <th className={styles.right}>Size</th>
            <th className={styles.right}>Price</th>
            <th className={styles.right}>Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id}>
              <td className={styles.left}>
                <a
                  className={styles.wallet}
                  href={`https://polymarket.com/profile/${t.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {shortenAddress(t.wallet)}
                </a>
              </td>
              <td className={styles.left}>
                <span
                  className={t.side === "sell" ? styles.sell : styles.buy}
                >
                  {t.side === "sell" ? "SELL" : "BUY"}
                </span>
                {t.outcome ? (
                  <span className={styles.outcome}>{t.outcome}</span>
                ) : null}
              </td>
              {showMarket ? (
                <td className={styles.left}>
                  {t.market ? (
                    <Link className={styles.market} href={`/markets/${t.market.id}`}>
                      {t.market.question}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              ) : null}
              <td className={styles.right}>{formatCompactUsd(t.sizeUsdc)}</td>
              <td className={styles.right}>{formatYesPrice(t.price)}</td>
              <td className={styles.right}>{formatRelativeTime(t.ts)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
