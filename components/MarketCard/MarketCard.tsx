import Link from "next/link";

import { formatCompactUsd, formatYesPrice } from "@/lib/format";
import styles from "./MarketCard.module.scss";

type Numeric = number | string | { toString(): string } | null | undefined;

export interface MarketCardProps {
  id: string;
  question: string;
  category: string | null;
  yesPrice: Numeric;
  volume: Numeric;
  liquidity: Numeric;
}

export function MarketCard({
  id,
  question,
  category,
  yesPrice,
  volume,
  liquidity,
}: MarketCardProps) {
  return (
    <Link href={`/markets/${id}`} className={styles.card}>
      {category ? <span className={styles.category}>{category}</span> : null}
      <p className={styles.question}>{question}</p>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>YES</span>
          <span className={styles.statValue}>{formatYesPrice(yesPrice)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Volume</span>
          <span className={styles.statValue}>{formatCompactUsd(volume)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Liquidity</span>
          <span className={styles.statValue}>{formatCompactUsd(liquidity)}</span>
        </div>
      </div>
    </Link>
  );
}
