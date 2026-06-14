import { Activity, Trophy, Waves } from "lucide-react";

import type { StatCardProps } from "@/components/data/StatCard";
import { prisma } from "@/lib/db/prisma";

export interface PlatformStats {
  totalMarkets: number;
  whaleVolume24h: number;
  whaleVolume7d: number;
  /** 24h volume vs prior-6-day daily average, as a signed fraction. */
  whaleVolumeDelta: number | null;
  activeWhales24h: number;
  whaleTrades24h: number;
  biggestTrade24h: number;
  avgWinRate: number | null;
  totalRealizedPnl: number;
}

const DAY = 24 * 60 * 60 * 1000;
const TTL = 60_000;

// In-process TTL memo. unstable_cache is unreliable under force-dynamic routes,
// and these aggregates only need to be ~minute-fresh. Per server instance.
let cache: { at: number; data: PlatformStats } | null = null;

export async function getPlatformStats(): Promise<PlatformStats> {
  const now = Date.now();
  if (cache && now - cache.at < TTL) return cache.data;

  const since24h = new Date(now - DAY);
  const since7d = new Date(now - 7 * DAY);
  const whale24 = { isWhale: true, ts: { gte: since24h } } as const;

  const [
    totalMarkets,
    vol24,
    vol7,
    biggest24,
    activeWhales,
    whaleTrades24h,
    winAgg,
    pnlAgg,
  ] = await Promise.all([
    prisma.market.count({ where: { closed: false } }),
    prisma.trade.aggregate({ _sum: { sizeUsdc: true }, where: whale24 }),
    prisma.trade.aggregate({
      _sum: { sizeUsdc: true },
      where: { isWhale: true, ts: { gte: since7d } },
    }),
    prisma.trade.aggregate({ _max: { sizeUsdc: true }, where: whale24 }),
    prisma.trade.findMany({
      where: whale24,
      distinct: ["wallet"],
      select: { wallet: true },
    }),
    prisma.trade.count({ where: whale24 }),
    prisma.whaleWallet.aggregate({ _avg: { winRate: true } }),
    prisma.whaleWallet.aggregate({ _sum: { realizedPnl: true } }),
  ]);

  const whaleVolume24h = Number(vol24._sum.sizeUsdc ?? 0);
  const whaleVolume7d = Number(vol7._sum.sizeUsdc ?? 0);
  const priorDailyAvg = (whaleVolume7d - whaleVolume24h) / 6;
  const whaleVolumeDelta =
    priorDailyAvg > 0 ? (whaleVolume24h - priorDailyAvg) / priorDailyAvg : null;

  const data: PlatformStats = {
    totalMarkets,
    whaleVolume24h,
    whaleVolume7d,
    whaleVolumeDelta,
    activeWhales24h: activeWhales.length,
    whaleTrades24h,
    biggestTrade24h: Number(biggest24._max.sizeUsdc ?? 0),
    avgWinRate: winAgg._avg.winRate != null ? Number(winAgg._avg.winRate) : null,
    totalRealizedPnl: Number(pnlAgg._sum.realizedPnl ?? 0),
  };

  cache = { at: now, data };
  return data;
}

/** Shared platform KPI cards for the dashboard / whales / landing stat strips. */
export async function getPlatformStatCards(): Promise<StatCardProps[]> {
  const s = await getPlatformStats();
  return [
    {
      label: "Whale volume 24h",
      value: s.whaleVolume24h,
      format: "usd",
      delta: s.whaleVolumeDelta,
      deltaLabel: "vs avg",
      icon: Waves,
    },
    {
      label: "Active whales 24h",
      value: s.activeWhales24h,
      format: "int",
      icon: Activity,
    },
    {
      label: "Whale trades 24h",
      value: s.whaleTrades24h,
      format: "int",
    },
    {
      label: "Biggest trade 24h",
      value: s.biggestTrade24h,
      format: "usd",
      icon: Trophy,
    },
    {
      label: "Markets tracked",
      value: s.totalMarkets,
      format: "int",
    },
  ];
}
