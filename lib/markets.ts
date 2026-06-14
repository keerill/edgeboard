import type { MarketCardProps } from "@/components/MarketCard/MarketCard";
import { cachedTTL } from "@/lib/cache";
import { prisma } from "@/lib/db/prisma";

// Cached reads for the /markets grid. The grid is heavy (≈100 markets × N price
// snapshots + a per-market whale-count groupBy), so the browse case (sort /
// category, no search) is cached; free-text search bypasses the cache to avoid
// an unbounded keyspace. Values are mapped to plain primitives (no Decimal).

const DAY = 24 * 60 * 60 * 1000;
// Snapshots refresh every 10 min; 60s keeps sort/category toggles instant.
const GRID_TTL = 60_000;
const CATEGORIES_TTL = 600_000;

export type MarketSort = "volume" | "liquidity";

/** A fully-prepared MarketCard row (the page can spread this straight in). */
export type MarketGridItem = Required<
  Pick<
    MarketCardProps,
    | "id"
    | "question"
    | "category"
    | "yesPrice"
    | "volume"
    | "liquidity"
    | "series"
    | "delta"
    | "endDate"
    | "whaleCount"
  >
>;

/** Absolute YES-price change (percentage points) across the snapshot window. */
function seriesDelta(series: number[]): number | null {
  if (series.length < 2) return null;
  return series[series.length - 1] - series[0];
}

async function loadMarketsGrid(opts: {
  q?: string;
  category?: string;
  sort: MarketSort;
  limit: number;
  sparkN: number;
}): Promise<MarketGridItem[]> {
  const { q, category, sort, limit, sparkN } = opts;

  const markets = await prisma.market.findMany({
    where: {
      closed: false,
      ...(q ? { question: { contains: q, mode: "insensitive" } } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { [sort]: "desc" },
    take: limit,
    include: { priceSnapshots: { orderBy: { ts: "desc" }, take: sparkN } },
  });

  // One grouped query for 24h whale-trade counts across the visible markets.
  const marketIds = markets.map((m) => m.id);
  const whaleRows = marketIds.length
    ? await prisma.trade.groupBy({
        by: ["marketId"],
        where: {
          isWhale: true,
          ts: { gte: new Date(Date.now() - DAY) },
          marketId: { in: marketIds },
        },
        _count: { _all: true },
      })
    : [];
  const whaleByMarket = new Map(whaleRows.map((w) => [w.marketId, w._count._all]));

  return markets.map((m) => {
    const series = [...m.priceSnapshots].reverse().map((s) => Number(s.price));
    const yes = m.priceSnapshots[0]?.price;
    return {
      id: m.id,
      question: m.question,
      category: m.category,
      yesPrice: yes != null ? Number(yes) : null,
      volume: m.volume == null ? null : Number(m.volume),
      liquidity: m.liquidity == null ? null : Number(m.liquidity),
      series,
      delta: seriesDelta(series),
      endDate: m.endDate,
      whaleCount: whaleByMarket.get(m.id) ?? 0,
    };
  });
}

export async function getMarketsGrid(opts: {
  q?: string;
  category?: string;
  sort: MarketSort;
  limit: number;
  sparkN: number;
}): Promise<MarketGridItem[]> {
  // Search is unbounded — don't pollute the cache with one entry per query.
  if (opts.q) return loadMarketsGrid(opts);
  const key = `markets-grid:${opts.category ?? ""}:${opts.sort}:${opts.limit}:${opts.sparkN}`;
  return cachedTTL(key, GRID_TTL, () => loadMarketsGrid(opts));
}

export async function getMarketCategories(): Promise<string[]> {
  return cachedTTL("market-categories", CATEGORIES_TTL, async () => {
    const rows = await prisma.market.findMany({
      where: { closed: false, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return rows.map((r) => r.category).filter((c): c is string => Boolean(c));
  });
}
