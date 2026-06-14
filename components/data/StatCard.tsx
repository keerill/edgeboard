import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import {
  AnimatedNumber,
  type NumberFormat,
} from "@/components/motion/AnimatedNumber";
import { formatPercent } from "@/lib/format";
import { Sparkline } from "./Sparkline";
import styles from "./statcard.module.scss";

export interface StatCardProps {
  label: string;
  value: number;
  format?: NumberFormat;
  /** Signed fraction, e.g. +0.124 → "+12.4% ↑". null/0 → no chip. */
  delta?: number | null;
  deltaLabel?: string;
  /** Optional inline sparkline series. */
  series?: number[];
  icon?: LucideIcon;
  accent?: boolean;
}

export function StatCard({
  label,
  value,
  format,
  delta,
  deltaLabel,
  series,
  icon: Icon,
  accent,
}: StatCardProps) {
  const dir =
    delta == null || delta === 0 ? "neutral" : delta > 0 ? "up" : "down";

  const deltaClass =
    dir === "up"
      ? styles.deltaUp
      : dir === "down"
        ? styles.deltaDown
        : styles.deltaNeutral;

  const sparkClass =
    dir === "up"
      ? styles.sparkUp
      : dir === "down"
        ? styles.sparkDown
        : styles.sparkAccent;

  return (
    <div className={accent ? styles.cardAccent : styles.card}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        {Icon ? <Icon size={15} className={styles.icon} /> : null}
      </div>

      <div className={styles.value}>
        <AnimatedNumber value={value} format={format} />
      </div>

      <div className={styles.foot}>
        {delta != null ? (
          <span className={deltaClass}>
            {dir === "up" ? (
              <ArrowUpRight size={12} />
            ) : dir === "down" ? (
              <ArrowDownRight size={12} />
            ) : null}
            {formatPercent(Math.abs(delta))}
            {deltaLabel ? (
              <span className={styles.deltaLabel}>{deltaLabel}</span>
            ) : null}
          </span>
        ) : (
          <span className={styles.deltaSpacer} />
        )}

        {series && series.length > 1 ? (
          <span className={sparkClass}>
            <Sparkline data={series} width={84} height={26} fill />
          </span>
        ) : null}
      </div>
    </div>
  );
}
