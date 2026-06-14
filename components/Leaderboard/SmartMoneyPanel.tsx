import type { ReactNode } from "react";

import styles from "./smartmoney.module.scss";

/**
 * Centerpiece "Smart Money" frame around the whale Leaderboard — a glowing,
 * accent-washed panel with a display-font heading. Presentational only; pass the
 * <Leaderboard> (and any footnote) as children.
 */
export function SmartMoneyPanel({
  title = "Smart-money leaderboard",
  subtitle,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.titles}>
          <span className={styles.eyebrow}>Smart money</span>
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
