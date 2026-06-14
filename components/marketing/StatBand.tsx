import {
  AnimatedNumber,
  type NumberFormat,
} from "@/components/motion/AnimatedNumber";
import styles from "./statband.module.scss";

export interface StatBandItem {
  label: string;
  value: number;
  format?: NumberFormat;
  /** Optional accent suffix, e.g. "+" for a Nansen-style "500M+" figure. */
  suffix?: string;
}

// Full-width band of a few oversized platform figures — the marketing
// "scale / credibility" moment (à la nansen.ai's "0M+ Labelled Addresses").
// Numbers count up on the client; labels stay quiet underneath.
export function StatBand({ items }: { items: StatBandItem[] }) {
  return (
    <dl className={styles.band}>
      {items.map((it) => (
        <div key={it.label} className={styles.item}>
          <dd className={styles.value}>
            <AnimatedNumber value={it.value} format={it.format} />
            {it.suffix ? <span className={styles.suffix}>{it.suffix}</span> : null}
          </dd>
          <dt className={styles.label}>{it.label}</dt>
        </div>
      ))}
    </dl>
  );
}
