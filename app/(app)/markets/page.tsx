import { BarChart3 } from "lucide-react";

import { ContextBar } from "@/components/Shell/ContextBar";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { FilterPills } from "@/components/Filters/FilterPills";
import { FilterProvider } from "@/components/Filters/FilterProvider";
import { PendingRegion } from "@/components/Filters/PendingRegion";
import { SearchForm } from "@/components/Filters/SearchForm";
import { MarketCard } from "@/components/MarketCard/MarketCard";
import { MotionList } from "@/components/motion/MotionList";
import { getMarketCategories, getMarketsGrid } from "@/lib/markets";
import styles from "./markets.module.scss";

// Always render fresh from the DB (data is updated by the ingestion crons).
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const SPARK_N = 24; // snapshots per market for the inline sparkline
const SORTS = { volume: "Volume", liquidity: "Liquidity" } as const;
type Sort = keyof typeof SORTS;

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const sort: Sort = sp.sort === "liquidity" ? "liquidity" : "volume";

  // Cached, filter-keyed reads (see lib/markets.ts); search bypasses the cache.
  const [markets, categories] = await Promise.all([
    getMarketsGrid({ q, category, sort, limit: PAGE_SIZE, sparkN: SPARK_N }),
    getMarketCategories(),
  ]);

  const searchHidden: Record<string, string> = {};
  if (category) searchHidden.category = category;
  if (sort !== "volume") searchHidden.sort = sort;

  const searchForm = (
    <SearchForm
      action="/markets"
      placeholder="Search markets…"
      hidden={searchHidden}
    />
  );

  return (
    <FilterProvider>
      <section className={styles.page}>
        <ContextBar eyebrow="Polymarket" title="Markets" actions={searchForm}>
          <div className={styles.controls}>
            <FilterPills
              label="Sort"
              param="sort"
              active={sort}
              defaultValue="volume"
              options={(Object.keys(SORTS) as Sort[]).map((key) => ({
                value: key,
                label: SORTS[key],
              }))}
            />

            {categories.length > 0 ? (
              <FilterPills
                label="Category"
                param="category"
                active={category ?? ""}
                defaultValue=""
                options={[
                  { value: "", label: "All" },
                  ...categories.map((cat) => ({ value: cat, label: cat })),
                ]}
              />
            ) : null}
          </div>
        </ContextBar>

        <PendingRegion>
          {markets.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title={
                q || category
                  ? "No markets match your filters"
                  : "No markets yet"
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
              {markets.map((m) => (
                <MarketCard key={m.id} {...m} />
              ))}
            </MotionList>
          )}
        </PendingRegion>
      </section>
    </FilterProvider>
  );
}
