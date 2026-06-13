import Link from "next/link";

import styles from "./page.module.scss";

export default function LandingPage() {
  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          See what smart money is doing — and your whole P&amp;L in one place.
        </h1>
        <p className={styles.subtitle}>
          Analytics for Polymarket prediction-market traders: whale moves, price
          history with big trades, and portfolio P&amp;L.
        </p>
        <div>
          <Link href="/signin" className={styles.cta}>
            Sign up
          </Link>
        </div>
      </section>

      {/* Placeholder — the full marketing landing is built in Phase 6. */}
      <p className={styles.note}>
        Phase 1 skeleton. Whale moves · Price history with big trades · Portfolio
        P&amp;L · Alerts coming soon.
      </p>
    </div>
  );
}
