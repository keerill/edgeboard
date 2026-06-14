import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Waves } from "lucide-react";

import { Sparkline } from "@/components/data/Sparkline";
import {
  formatCompactUsd,
  formatCountdown,
  formatPercent,
  formatYesPrice,
} from "@/lib/format";
import styles from "./MarketCard.module.scss";

type Numeric = number | string | { toString(): string } | null | undefined;

export interface MarketCardProps {
  id: string;
  question: string;
  category: string | null;
  yesPrice: Numeric;
  volume: Numeric;
  liquidity: Numeric;
  /** Oldest→newest YES price series for the inline sparkline. */
  series?: number[];
  /** Signed fraction price change over the series window. */
  delta?: number | null;
  endDate?: Date | string | null;
  whaleCount?: number;
}

function toNum(value: Numeric): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

export function MarketCard({
  id,
  question,
  category,
  yesPrice,
  volume,
  liquidity,
  series,
  delta,
  endDate,
  whaleCount,
}: MarketCardProps) {
  const yes = toNum(yesPrice);
  const pct = yes === null ? 0 : Math.max(0, Math.min(100, yes * 100));
  const dir =
    delta == null || delta === 0 ? "neutral" : delta > 0 ? "up" : "down";
  const sparkClass =
    dir === "up"
      ? styles.sparkUp
      : dir === "down"
        ? styles.sparkDown
        : styles.sparkAccent;

  return (
    <Link href={`/markets/${id}`} className={styles.card}>
      <div className={styles.top}>
        {category ? (
          <span className={styles.category}>{category}</span>
        ) : (
          <span />
        )}
        {whaleCount ? (
          <span className={styles.whale} title={`${whaleCount} whale trades · 24h`}>
            <Waves size={12} />
            {whaleCount}
          </span>
        ) : null}
      </div>

      <p className={styles.question}>{question}</p>

      <div className={styles.prob}>
        <div className={styles.probHead}>
          <span className={styles.probLabel}>YES</span>
          <span className={styles.probValue}>{formatYesPrice(yesPrice)}</span>
        </div>
        <div className={styles.probTrack}>
          <div className={styles.probFill} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={styles.sparkRow}>
        <span className={`${styles.spark} ${sparkClass}`}>
          <Sparkline data={series ?? []} height={34} responsive fill />
        </span>
        {delta != null ? (
          <span className={dir === "down" ? styles.deltaDown : styles.deltaUp}>
            {dir === "down" ? (
              <ArrowDownRight size={12} />
            ) : (
              <ArrowUpRight size={12} />
            )}
            {formatPercent(Math.abs(delta))}
          </span>
        ) : null}
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Volume</span>
          <span className={styles.statValue}>{formatCompactUsd(volume)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Liquidity</span>
          <span className={styles.statValue}>{formatCompactUsd(liquidity)}</span>
        </div>
        {endDate ? (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Ends</span>
            <span className={styles.statValue}>{formatCountdown(endDate)}</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
