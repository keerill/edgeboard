import type { LeaderRow } from "@/components/Leaderboard/Leaderboard";
import type { TradeRow } from "@/components/TradesTable/TradesTable";
import { cachedTTL } from "@/lib/cache";
import { prisma } from "@/lib/db/prisma";

// Cached whale queries for the /whales page. The heavy bits (the leaderboard's
// per-wallet groupBy and the distinct-category scan) are filter-independent, so
// caching them speeds up *every* navigation; the feed is cached per filter so
// toggling 24h <-> 7d (or back to a category) is a cache hit. All values are
// mapped to plain primitives at the cache boundary (no Prisma Decimal/Date
// leaks into client components).

const DAY = 24 * 60 * 60 * 1000;
const RANKING_LIMIT = 20;

export const WHALE_PERIODS = { "24h": DAY, "7d": 7 * DAY } as const;
export type WhalePeriod = keyof typeof WHALE_PERIODS;

// Trades refresh every 5 min; 60s keeps repeat toggles snappy without going stale.
const FEED_TTL = 60_000;
// whale_wallets refresh hourly; the 24h/7d shares read trades — ~2 min is safe.
const LEADER_TTL = 120_000;
// Categories rarely change.
const CATEGORIES_TTL = 600_000;

export async function getWhaleFeed(opts: {
  period: WhalePeriod;
  category?: string;
  limit: number;
}): Promise<TradeRow[]> {
  const { period, category, limit } = opts;
  const key = `whale-feed:${period}:${category ?? ""}:${limit}`;
  return cachedTTL(key, FEED_TTL, async () => {
    const cutoff = new Date(Date.now() - WHALE_PERIODS[period]);
    const feed = await prisma.trade.findMany({
      where: {
        isWhale: true,
        ts: { gte: cutoff },
        ...(category ? { market: { category } } : {}),
      },
      orderBy: { sizeUsdc: "desc" },
      take: limit,
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
    });
    return feed.map((t) => ({
      id: t.id,
      wallet: t.wallet,
      side: t.side,
      sizeUsdc: Number(t.sizeUsdc),
      price: Number(t.price),
      outcome: t.outcome,
      ts: t.ts,
      market: t.market,
    }));
  });
}

export async function getWhaleCategories(): Promise<string[]> {
  return cachedTTL("whale-categories", CATEGORIES_TTL, async () => {
    const rows = await prisma.market.findMany({
      where: { closed: false, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return rows.map((r) => r.category).filter((c): c is string => Boolean(c));
  });
}

/** Top wallets by traded volume + their recent-activity share. Filter-independent. */
export async function getWhaleLeaderboard(): Promise<LeaderRow[]> {
  return cachedTTL("whale-leaderboard", LEADER_TTL, async () => {
    const ranking = await prisma.whaleWallet.findMany({
      orderBy: { totalVolumeUsdc: "desc" },
      take: RANKING_LIMIT,
    });
    if (!ranking.length) return [];

    const addrs = ranking.map((w) => w.address);
    const now = Date.now();
    const [v24, v7] = await Promise.all([
      prisma.trade.groupBy({
        by: ["wallet"],
        where: { isWhale: true, wallet: { in: addrs }, ts: { gte: new Date(now - DAY) } },
        _sum: { sizeUsdc: true },
      }),
      prisma.trade.groupBy({
        by: ["wallet"],
        where: {
          isWhale: true,
          wallet: { in: addrs },
          ts: { gte: new Date(now - 7 * DAY) },
        },
        _sum: { sizeUsdc: true },
      }),
    ]);
    const m24 = new Map(v24.map((r) => [r.wallet, Number(r._sum.sizeUsdc ?? 0)]));
    const m7 = new Map(v7.map((r) => [r.wallet, Number(r._sum.sizeUsdc ?? 0)]));

    return ranking.map((w, i) => {
      const s7 = m7.get(w.address) ?? 0;
      const s24 = m24.get(w.address) ?? 0;
      return {
        rank: i + 1,
        address: w.address,
        totalVolume: Number(w.totalVolumeUsdc),
        volShare24h: s7 > 0 ? s24 / s7 : null,
        realizedPnl: w.realizedPnl == null ? null : Number(w.realizedPnl),
        winRate: w.winRate == null ? null : Number(w.winRate),
        lastActive: w.lastActive,
      };
    });
  });
}
