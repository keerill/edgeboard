import { Activity, CircleDollarSign, Hexagon, Layers } from "lucide-react";

import styles from "./logostrip.module.scss";

// Quiet "powered by" trust row — EdgeBoard's stand-in for nansen.ai's chain /
// partner logo strip. Icon + wordmark chips instead of sourced brand logos.
const SOURCES = [
  { label: "Polymarket", Icon: Layers },
  { label: "Polygon", Icon: Hexagon },
  { label: "USDC", Icon: CircleDollarSign },
  { label: "Real-time", Icon: Activity },
];

export function LogoStrip() {
  return (
    <div className={styles.strip}>
      <span className={styles.lead}>Powered by Polymarket data</span>
      <ul className={styles.logos}>
        {SOURCES.map(({ label, Icon }) => (
          <li key={label} className={styles.logo}>
            <Icon size={16} aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
