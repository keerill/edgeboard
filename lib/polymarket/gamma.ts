// Gamma API client — market metadata (spec §5.1). Public, no auth.
// Base: https://gamma-api.polymarket.com (override via GAMMA_API_BASE).

import { fetchJson } from "./http";
import type { GammaMarket } from "./types";

const GAMMA_API_BASE =
  process.env.GAMMA_API_BASE ?? "https://gamma-api.polymarket.com";

const PAGE_SIZE = 100;

interface GetActiveMarketsOptions {
  /** Max markets to return across pages (default 200, per §7 MVP cap). */
  limit?: number;
}

/**
 * Fetch active, non-closed markets ordered by total volume (desc), paginating
 * until `limit` is reached or the API returns a short page. Backoff on 429 is
 * handled inside fetchJson.
 */
export async function getActiveMarkets(
  options: GetActiveMarketsOptions = {},
): Promise<GammaMarket[]> {
  const limit = options.limit ?? 200;
  const collected: GammaMarket[] = [];

  for (let offset = 0; collected.length < limit; offset += PAGE_SIZE) {
    const params = new URLSearchParams({
      active: "true",
      closed: "false",
      order: "volume",
      ascending: "false",
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });

    const page = await fetchJson<GammaMarket[]>(
      `${GAMMA_API_BASE}/markets?${params.toString()}`,
    );

    if (!Array.isArray(page) || page.length === 0) break;
    collected.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return collected.slice(0, limit);
}
