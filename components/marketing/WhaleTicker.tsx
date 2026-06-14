import { Identicon } from "@/components/Identicon/Identicon";
import type { TradeRow } from "@/components/TradesTable/TradesTable";
import {
  formatCompactUsd,
  formatRelativeTime,
  shortenAddress,
} from "@/lib/format";
import styles from "./whaleticker.module.scss";

/**
 * Horizontally scrolling marquee of recent whale trades. Pure CSS animation —
 * the track is duplicated and translated -50% for a seamless loop, it pauses on
 * hover, and freezes into a scrollable strip under prefers-reduced-motion.
 * Server-renderable: pass trades fetched in a server component (reuses the
 * existing `isWhale` queries). Renders nothing when there are no trades.
 */
export function WhaleTicker({ trades }: { trades: TradeRow[] }) {
  if (trades.length === 0) return null;

  // Duplicate the set so the -50% loop is seamless; the copy is aria-hidden so
  // screen readers don't announce every trade twice.
  const items = [...trades, ...trades];

  return (
    <div className={styles.ticker} aria-label="Recent whale trades">
      <div className={styles.track}>
        {items.map((t, i) => (
          <div
            key={`${t.id}-${i}`}
            className={styles.item}
            aria-hidden={i >= trades.length ? true : undefined}
          >
            <Identicon address={t.wallet} size={18} />
            <span className={styles.wallet}>{shortenAddress(t.wallet)}</span>
            <span className={t.side === "sell" ? styles.sell : styles.buy}>
              {t.side === "sell" ? "SELL" : "BUY"}
            </span>
            <span className={styles.size}>{formatCompactUsd(t.sizeUsdc)}</span>
            {t.market ? (
              <span className={styles.market}>{t.market.question}</span>
            ) : null}
            <span className={styles.time}>{formatRelativeTime(t.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
