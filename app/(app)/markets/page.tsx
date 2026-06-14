import Link from "next/link";
import { BarChart3, Search } from "lucide-react";

import { ContextBar } from "@/components/Shell/ContextBar";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { MarketCard } from "@/components/MarketCard/MarketCard";
import { MotionList } from "@/components/motion/MotionList";
import { prisma } from "@/lib/db/prisma";
import styles from "./markets.module.scss";

// Always render fresh from the DB (data is updated by the ingestion crons).
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const SPARK_N = 24; // snapshots per market for the inline sparkline
const DAY = 24 * 60 * 60 * 1000;
const SORTS = { volume: "Volume", liquidity: "Liquidity" } as const;
type Sort = keyof typeof SORTS;

function buildHref(params: { q?: string; category?: string; sort?: Sort }): string {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);
  if (params.sort && params.sort !== "volume") qs.set("sort", params.sort);
  const s = qs.toString();
  return s ? `/markets?${s}` : "/markets";
}

/** Absolute YES-price change (percentage points) across the snapshot window. */
function seriesDelta(series: number[]): number | null {
  if (series.length < 2) return null;
  return series[series.length - 1] - series[0];
}

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const sort: Sort = sp.sort === "liquidity" ? "liquidity" : "volume";

  const [markets, categoryRows] = await Promise.all([
    prisma.market.findMany({
      where: {
        closed: false,
        ...(q ? { question: { contains: q, mode: "insensitive" } } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { [sort]: "desc" },
      take: PAGE_SIZE,
      include: { priceSnapshots: { orderBy: { ts: "desc" }, take: SPARK_N } },
    }),
    prisma.market.findMany({
      where: { closed: false, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

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

  const categories = categoryRows
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c));

  const searchForm = (
    <form className={styles.search} action="/markets" method="get">
      {category ? <input type="hidden" name="category" value={category} /> : null}
      {sort !== "volume" ? (
        <input type="hidden" name="sort" value={sort} />
      ) : null}
      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="search"
          name="q"
          placeholder="Search markets…"
          defaultValue={q ?? ""}
          aria-label="Search markets"
        />
      </div>
      <button className={styles.searchBtn} type="submit">
        Search
      </button>
    </form>
  );

  return (
    <section className={styles.page}>
      <ContextBar
        eyebrow="Polymarket"
        title="Markets"
        actions={searchForm}
      >
        <div className={styles.controls}>
          <div className={styles.sortGroup}>
            <span className={styles.controlLabel}>Sort</span>
            {(Object.keys(SORTS) as Sort[]).map((key) => (
              <Link
                key={key}
                href={buildHref({ q, category, sort: key })}
                className={key === sort ? styles.chipActive : styles.chip}
              >
                {SORTS[key]}
              </Link>
            ))}
          </div>

          {categories.length > 0 ? (
            <div className={styles.categoryGroup}>
              <span className={styles.controlLabel}>Category</span>
              <Link
                href={buildHref({ q, sort })}
                className={!category ? styles.chipActive : styles.chip}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={buildHref({ q, category: cat, sort })}
                  className={cat === category ? styles.chipActive : styles.chip}
                >
                  {cat}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </ContextBar>

      {markets.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={
            q || category ? "No markets match your filters" : "No markets yet"
          }
          description={
            q || category
              ? "Try a different search term or category."
              : "Markets appear here once ingestion has run — live Polymarket data syncs automatically."
          }
        />
      ) : (
        <MotionList
          key={`${q ?? ""}-${category ?? ""}-${sort}`}
          className={styles.grid}
        >
          {markets.map((m) => {
            const series = [...m.priceSnapshots]
              .reverse()
              .map((s) => Number(s.price));
            return (
              <MarketCard
                key={m.id}
                id={m.id}
                question={m.question}
                category={m.category}
                yesPrice={m.priceSnapshots[0]?.price ?? null}
                volume={m.volume}
                liquidity={m.liquidity}
                series={series}
                delta={seriesDelta(series)}
                endDate={m.endDate}
                whaleCount={whaleByMarket.get(m.id) ?? 0}
              />
            );
          })}
        </MotionList>
      )}
    </section>
  );
}
