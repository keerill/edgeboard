import Link from "next/link";
import { Search } from "lucide-react";

import { MarketCard } from "@/components/MarketCard/MarketCard";
import { MotionList } from "@/components/motion/MotionList";
import { prisma } from "@/lib/db/prisma";
import styles from "./markets.module.scss";

// Always render fresh from the DB (data is updated by the ingestion crons).
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const SORTS = { volume: "Volume", liquidity: "Liquidity" } as const;
type Sort = keyof typeof SORTS;

function buildHref(params: {
  q?: string;
  category?: string;
  sort?: Sort;
}): string {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);
  if (params.sort && params.sort !== "volume") qs.set("sort", params.sort);
  const s = qs.toString();
  return s ? `/markets?${s}` : "/markets";
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
      include: { priceSnapshots: { orderBy: { ts: "desc" }, take: 1 } },
    }),
    prisma.market.findMany({
      where: { closed: false, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  const categories = categoryRows
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c));

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Markets</h1>
        <form className={styles.search} action="/markets" method="get">
          {category ? (
            <input type="hidden" name="category" value={category} />
          ) : null}
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
      </header>

      <div className={styles.controls}>
        <div className={styles.sortGroup}>
          <span className={styles.controlLabel}>Sort</span>
          {(Object.keys(SORTS) as Sort[]).map((key) => (
            <Link
              key={key}
              href={buildHref({ q, category, sort: key })}
              className={
                key === sort ? styles.chipActive : styles.chip
              }
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

      {markets.length === 0 ? (
        <p className={styles.empty}>
          No markets yet — run the <code>sync-markets</code> cron to ingest live
          data from Polymarket.
        </p>
      ) : (
        <MotionList
          key={`${q ?? ""}-${category ?? ""}-${sort}`}
          className={styles.grid}
        >
          {markets.map((m) => (
            <MarketCard
              key={m.id}
              id={m.id}
              question={m.question}
              category={m.category}
              yesPrice={m.priceSnapshots[0]?.price ?? null}
              volume={m.volume}
              liquidity={m.liquidity}
            />
          ))}
        </MotionList>
      )}
    </section>
  );
}
