import Link from "next/link";
import { ArrowRight, Bell, LineChart, Waves, Wallet } from "lucide-react";

import { MotionList } from "@/components/motion/MotionList";
import { PLAN_LIMITS } from "@/lib/plan";
import styles from "./page.module.scss";

// Marketing copy is driven by §14 of docs/instruction.md. Plan numbers are
// pulled from PLAN_LIMITS so pricing stays in sync with the actual gating.
const FEATURES = [
  {
    title: "Whale moves",
    body: "See what large wallets are buying and selling across every market.",
    Icon: Waves,
  },
  {
    title: "Price history with big trades",
    body: "Market price charts with whale trades marked right on the timeline.",
    Icon: LineChart,
  },
  {
    title: "Portfolio P&L",
    body: "Track any public wallet's positions, P&L and win rate in one view.",
    Icon: Wallet,
  },
  {
    title: "Alerts",
    body: "Get notified when whales move or prices swing.",
    soon: true,
    Icon: Bell,
  },
];

const free = PLAN_LIMITS.free;
const pro = PLAN_LIMITS.pro;

const PLANS = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    featured: false,
    perks: [
      `${free.trackedWallets} tracked wallet`,
      `${free.historyDays}-day price history`,
      `Top ${free.whaleFeedLimit} whale trades`,
    ],
  },
  {
    name: "Pro",
    price: "€15",
    period: "per month",
    featured: true,
    perks: [
      "Multiple tracked wallets",
      "Full price history",
      `Top ${pro.whaleFeedLimit} whale trades + leaderboard`,
      "Alerts (coming soon)",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>
          Smart money analytics for Polymarket
        </span>
        <h1 className={styles.title}>
          See what smart money is doing —{" "}
          <span className={styles.titleAccent}>
            and your whole P&amp;L in one place.
          </span>
        </h1>
        <p className={styles.subtitle}>
          Analytics for Polymarket prediction-market traders: whale moves, price
          history with big trades, and portfolio P&amp;L.
        </p>
        <div className={styles.heroCtas}>
          <Link href="/signin" className={styles.ctaPrimary}>
            Sign up <ArrowRight size={16} />
          </Link>
          <Link href="/whale-watch" className={styles.ctaSecondary}>
            See live whale moves
          </Link>
        </div>
      </section>

      <MotionList className={styles.features}>
        {FEATURES.map((f) => (
          <div key={f.title} className={styles.feature}>
            <span className={styles.featureIcon}>
              <f.Icon size={18} />
            </span>
            <h2 className={styles.featureTitle}>
              {f.title}
              {f.soon ? <span className={styles.badge}>Soon</span> : null}
            </h2>
            <p className={styles.featureBody}>{f.body}</p>
          </div>
        ))}
      </MotionList>

      <section className={styles.pricing}>
        <h2 className={styles.sectionTitle}>Pricing</h2>
        <div className={styles.plans}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={plan.featured ? styles.planFeatured : styles.plan}
            >
              {plan.featured ? (
                <span className={styles.popular}>Most popular</span>
              ) : null}
              <div className={styles.planHead}>
                <span className={styles.planName}>{plan.name}</span>
                <span className={styles.planPrice}>
                  {plan.price}
                  <span className={styles.planPeriod}> {plan.period}</span>
                </span>
              </div>
              <ul className={styles.perks}>
                {plan.perks.map((perk) => (
                  <li key={perk} className={styles.perk}>
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                href="/signin"
                className={plan.featured ? styles.planCta : styles.planCtaAlt}
              >
                {plan.featured ? "Start Pro" : "Sign up free"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>Start tracking smart money today.</h2>
        <Link href="/signin" className={styles.ctaPrimary}>
          Sign up <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
