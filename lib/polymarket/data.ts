// Data API client — read-only wallet/trade data (spec §5.3). Public, no auth.
// Base: https://data-api.polymarket.com (override via DATA_API_BASE).

import { fetchJson } from "./http";
import type { DataTrade } from "./types";

const DATA_API_BASE =
  process.env.DATA_API_BASE ?? "https://data-api.polymarket.com";

interface GetWhaleTradesOptions {
  /** Max trades to fetch for the market (Data API caps at 10_000). */
  limit?: number;
}

/**
 * Recent large ("whale") trades for a market, filtered server-side by USDC
 * notional via `filterType=CASH` + `filterAmount` (§5.3). Returns taker trades
 * newest-first. Returns [] on failure (caller skips), mirroring clob.getMidpoint.
 * Short TTL cache so repeated reads within a cron run don't re-hit the API.
 */
export async function getWhaleTrades(
  conditionId: string,
  minUsdc: number,
  options: GetWhaleTradesOptions = {},
): Promise<DataTrade[]> {
  const { limit = 100 } = options;
  const params = new URLSearchParams({
    market: conditionId,
    filterType: "CASH",
    filterAmount: String(minUsdc),
    takerOnly: "true",
    limit: String(limit),
  });
  try {
    const trades = await fetchJson<DataTrade[]>(
      `${DATA_API_BASE}/trades?${params.toString()}`,
      { cacheTtlMs: 30_000 },
    );
    return Array.isArray(trades) ? trades : [];
  } catch {
    return [];
  }
}
