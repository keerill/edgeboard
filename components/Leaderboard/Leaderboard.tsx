import Link from "next/link";

import { Identicon } from "@/components/Identicon/Identicon";
import {
  formatCompactUsd,
  formatPercent,
  formatRelativeTime,
  shortenAddress,
} from "@/lib/format";
import styles from "./leaderboard.module.scss";

type Numeric = number | string | { toString(): string } | null | undefined;

export interface LeaderRow {
  rank: number;
  address: string;
  totalVolume: Numeric;
  /** Share of the wallet's 7d volume done in the last 24h (0..1), or null. */
  volShare24h?: number | null;
  realizedPnl: Numeric;
  winRate: Numeric;
  lastActive: Date | null;
}

function toNum(value: Numeric): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(n) ? n : 0;
}

export function Leaderboard({
  rows,
  linkProfiles = true,
  internalLinks = false,
}: {
  rows: LeaderRow[];
  linkProfiles?: boolean;
  /** Link wallets to our own /whales/[wallet] detail page instead of Polymarket. */
  internalLinks?: boolean;
}) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.rankCol}>#</th>
            <th className={styles.left}>Wallet</th>
            <th className={styles.right}>Volume</th>
            <th className={styles.right}>24h share</th>
            <th className={styles.right}>Est. P&amp;L</th>
            <th className={styles.winCol}>Win rate</th>
            <th className={styles.right}>Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const win = Math.max(0, Math.min(100, toNum(r.winRate) * 100));
            const pnlPos = toNum(r.realizedPnl) >= 0;
            const rankClass =
              r.rank === 1
                ? styles.rank1
                : r.rank === 2
                  ? styles.rank2
                  : r.rank === 3
                    ? styles.rank3
                    : styles.rank;
            return (
              <tr key={r.address}>
                <td>
                  <span className={rankClass}>{r.rank}</span>
                </td>
                <td className={styles.left}>
                  <span className={styles.walletCell}>
                    <Identicon address={r.address} size={26} />
                    {internalLinks ? (
                      <Link
                        className={styles.addr}
                        href={`/whales/${r.address}`}
                      >
                        {shortenAddress(r.address)}
                      </Link>
                    ) : linkProfiles ? (
                      <a
                        className={styles.addr}
                        href={`https://polymarket.com/profile/${r.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {shortenAddress(r.address)}
                      </a>
                    ) : (
                      <span className={styles.addr}>
                        {shortenAddress(r.address)}
                      </span>
                    )}
                  </span>
                </td>
                <td className={styles.right}>
                  {formatCompactUsd(r.totalVolume)}
                </td>
                <td className={styles.right}>
                  {r.volShare24h != null ? formatPercent(r.volShare24h) : "—"}
                </td>
                <td
                  className={`${styles.right} ${pnlPos ? styles.pos : styles.neg}`}
                >
                  {formatCompactUsd(r.realizedPnl)}
                </td>
                <td className={styles.winCol}>
                  <span className={styles.winCell}>
                    <span className={styles.winBar}>
                      <span
                        className={styles.winFill}
                        style={{ width: `${win}%` }}
                      />
                    </span>
                    <span className={styles.winVal}>
                      {formatPercent(r.winRate)}
                    </span>
                  </span>
                </td>
                <td className={styles.right}>
                  {r.lastActive ? formatRelativeTime(r.lastActive) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
