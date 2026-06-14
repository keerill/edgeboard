import { TrendingUp, Waves } from "lucide-react";

import { MarketCard } from "@/components/MarketCard/MarketCard";
import { StatCard } from "@/components/data/StatCard";
import styles from "./heropreview.module.scss";

// Non-interactive faux dashboard built from the real product components, so the
// marketing preview always matches the actual UI. Decorative (aria-hidden).
const SPARK_A = [3, 4, 3.5, 5, 4.4, 6, 5.6, 7.2, 6.8, 8.4];
const SPARK_B = [9, 8.4, 8.8, 7.2, 7.6, 6.4, 6.8, 5.6, 6, 5.2];
const SPARK_YES = [0.41, 0.43, 0.46, 0.44, 0.49, 0.53, 0.51, 0.57, 0.6, 0.62];

export function HeroPreview() {
  return (
    <div className={styles.frame} aria-hidden>
      <div className={styles.titlebar}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.crumb}>edgeboard · whales</span>
      </div>

      <div className={styles.body}>
        <div className={styles.strip}>
          <StatCard
            label="Whale volume 24h"
            value={4_820_000}
            format="usd"
            delta={0.18}
            deltaLabel="24h"
            series={SPARK_A}
            icon={Waves}
          />
          <StatCard
            label="Active whales"
            value={312}
            format="int"
            delta={0.06}
            series={SPARK_A}
            icon={TrendingUp}
          />
          <StatCard
            label="Biggest trade"
            value={1_240_000}
            format="usd"
            delta={-0.03}
            series={SPARK_B}
          />
        </div>

        <MarketCard
          id="preview"
          question="Will the Fed cut rates at the next meeting?"
          category="Economics"
          yesPrice={0.62}
          volume={2_410_000}
          liquidity={840_000}
          series={SPARK_YES}
          delta={0.04}
          whaleCount={7}
        />
      </div>
    </div>
  );
}
