import Link from "next/link";
import { ArrowRight, Bell, LineChart, Wallet, Waves } from "lucide-react";

import { HeroPreview } from "@/components/marketing/HeroPreview";
import { WhaleTicker } from "@/components/marketing/WhaleTicker";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { Reveal } from "@/components/motion/Reveal";
import { Spotlight } from "@/components/motion/Spotlight";
import { StatBand, type StatBandItem } from "@/components/marketing/StatBand";
import { LogoStrip } from "@/components/marketing/LogoStrip";
import {
  Leaderboard,
  type LeaderRow,
} from "@/components/Leaderboard/Leaderboard";
import { SmartMoneyPanel } from "@/components/Leaderboard/SmartMoneyPanel";
import {
  TradesTable,
  type TradeRow,
} from "@/components/TradesTable/TradesTable";
import { prisma } from "@/lib/db/prisma";
import { PLAN_LIMITS } from "@/lib/plan";
import { getPlatformStats } from "@/lib/stats";
import styles from "./page.module.scss";

// Pulls live platform stats + a whale-trade teaser, so it renders per request.
export const dynamic = "force-dynamic";

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
    Icon: Bell,
  },
];

const free = PLAN_LIMITS.free;
const pro = PLAN_LIMITS.pro;

const MATRIX: { feature: string; free: string; pro: string }[] = [
  {
    feature: "Tracked wallets",
    free: String(free.trackedWallets),
    pro: "Unlimited",
  },
  {
    feature: "Price history",
    free: `${free.historyDays} days`,
    pro: "Full history",
  },
  {
    feature: "Whale feed",
    free: `Top ${free.whaleFeedLimit}`,
    pro: `Top ${pro.whaleFeedLimit}`,
  },
  { feature: "Whale leaderboard", free: "—", pro: "✓" },
  { feature: "Alerts", free: "—", pro: "✓" },
];

export default async function LandingPage() {
  const [stats, recentTrades, topWhales] = await Promise.all([
    getPlatformStats(),
    prisma.trade.findMany({
      where: { isWhale: true },
      orderBy: { ts: "desc" },
      take: 12,
      select: {
        id: true,
        wallet: true,
        side: true,
        sizeUsdc: true,
        price: true,
        outcome: true,
        ts: true,
        market: { select: { id: true, question: true } },
      },
    }),
    prisma.whaleWallet.findMany({
      orderBy: { totalVolumeUsdc: "desc" },
      take: 5,
    }),
  ]);

  const trades: TradeRow[] = recentTrades.map((t) => ({
    id: t.id,
    wallet: t.wallet,
    side: t.side,
    sizeUsdc: t.sizeUsdc,
    price: t.price,
    outcome: t.outcome,
    ts: t.ts,
    market: t.market,
  }));

  const leaderRows: LeaderRow[] = topWhales.map((w, i) => ({
    rank: i + 1,
    address: w.address,
    totalVolume: w.totalVolumeUsdc,
    volShare24h: null,
    realizedPnl: w.realizedPnl,
    winRate: w.winRate,
    lastActive: w.lastActive,
  }));

  const bandItems: StatBandItem[] = [
    { label: "Markets tracked", value: stats.totalMarkets, format: "int" },
    { label: "Whale volume · 7d", value: stats.whaleVolume7d, format: "usd" },
    { label: "Whale trades · 24h", value: stats.whaleTrades24h, format: "int" },
    { label: "Active whales · 24h", value: stats.activeWhales24h, format: "int" },
  ];

  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
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
            Whale moves, price history with big trades, and portfolio P&amp;L for
            Polymarket prediction-market traders — in one fast dashboard.
          </p>
          <div className={styles.heroCtas}>
            <MagneticButton>
              <Link href="/signin" className={styles.ctaPrimary}>
                Sign up <ArrowRight size={16} />
              </Link>
            </MagneticButton>
            <Link href="/whale-watch" className={styles.ctaSecondary}>
              See live whale moves
            </Link>
          </div>
        </div>
        <div className={styles.heroPreview}>
          <HeroPreview />
        </div>
      </section>

      <WhaleTicker trades={trades} />

      <StatBand items={bandItems} />

      <Reveal whenInView className={styles.featuresSection}>
        <header className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Why EdgeBoard</span>
          <h2 className={styles.sectionTitle}>
            Everything you need to follow the smart money.
          </h2>
        </header>
        <div className={styles.features}>
          {FEATURES.map((f, i) => (
            <Spotlight key={f.title} className={styles.feature}>
              <div className={styles.featureHead}>
                <span className={styles.featureIcon}>
                  <f.Icon size={18} />
                </span>
                <span className={styles.featureIndex}>0{i + 1}</span>
              </div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureBody}>{f.body}</p>
            </Spotlight>
          ))}
        </div>
      </Reveal>

      <LogoStrip />

      <Reveal whenInView className={styles.dataPreview}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadTitles}>
            <span className={styles.sectionEyebrow}>Live feed</span>
            <h2 className={styles.sectionTitle}>Live whale moves</h2>
          </div>
          <Link href="/whale-watch" className={styles.sectionLink}>
            See all <ArrowRight size={14} />
          </Link>
        </div>
        <TradesTable
          trades={trades}
          showMarket
          linkMarkets={false}
          emptyMessage="No whale trades ingested yet — check back soon."
        />
      </Reveal>

      {leaderRows.length > 0 ? (
        <Reveal whenInView>
          <SmartMoneyPanel
            title="Top smart-money wallets"
            subtitle="The biggest wallets on Polymarket, ranked by traded volume — with estimated P&L and win rate."
            action={
              <Link href="/whale-watch" className={styles.sectionLink}>
                See all <ArrowRight size={14} />
              </Link>
            }
          >
            <Leaderboard rows={leaderRows} />
          </SmartMoneyPanel>
        </Reveal>
      ) : null}

      <Reveal whenInView className={styles.pricing}>
        <header className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Pricing</span>
          <h2 className={styles.sectionTitle}>Simple, honest pricing.</h2>
        </header>
        <div className={styles.matrixWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th className={styles.featureCol} />
                <th>
                  Free <span className={styles.planPrice}>€0</span>
                </th>
                <th className={styles.proCol}>
                  Pro <span className={styles.planPrice}>€15/mo</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((r) => (
                <tr key={r.feature}>
                  <td className={styles.featureCol}>{r.feature}</td>
                  <td>{r.free}</td>
                  <td className={styles.proCol}>{r.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.pricingCtas}>
          <Link href="/signin" className={styles.ctaSecondary}>
            Sign up free
          </Link>
          <MagneticButton>
            <Link href="/signin" className={styles.ctaPrimary}>
              Start Pro <ArrowRight size={16} />
            </Link>
          </MagneticButton>
        </div>
      </Reveal>

      <Reveal whenInView className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>Start tracking smart money today.</h2>
        <MagneticButton>
          <Link href="/signin" className={styles.ctaPrimary}>
            Sign up <ArrowRight size={16} />
          </Link>
        </MagneticButton>
      </Reveal>
    </div>
  );
}
