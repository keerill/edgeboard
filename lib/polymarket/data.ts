// Data API client — read-only wallet/trade data (spec §5.3). Public, no auth.
// Base: https://data-api.polymarket.com (override via DATA_API_BASE).

import { fetchJson } from "./http";
import type { DataPosition, DataTrade, DataValue } from "./types";

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

/** Max positions to fetch per wallet (covers all but the heaviest wallets). */
const POSITIONS_LIMIT = 500;

/**
 * Current positions for a public wallet (spec §5.3, §8 dashboard), with an `ok`
 * flag so callers can tell a genuine "no positions" from a Data API outage.
 * `ok=false` means the request failed (network/5xx) — the dashboard renders a
 * distinct "live data unavailable" state instead of an empty portfolio. One row
 * per outcome held, sorted by current value desc. TTL ~60s (§5.3).
 */
export async function getPositionsResult(
  address: string,
): Promise<{ positions: DataPosition[]; ok: boolean }> {
  const params = new URLSearchParams({
    user: address,
    sortBy: "CURRENT",
    sortDirection: "DESC",
    limit: String(POSITIONS_LIMIT),
  });
  try {
    const positions = await fetchJson<DataPosition[]>(
      `${DATA_API_BASE}/positions?${params.toString()}`,
      { cacheTtlMs: 60_000 },
    );
    return { positions: Array.isArray(positions) ? positions : [], ok: true };
  } catch {
    return { positions: [], ok: false };
  }
}

/** Positions only (back-compat). Returns [] on failure — see getPositionsResult. */
export async function getPositions(address: string): Promise<DataPosition[]> {
  return (await getPositionsResult(address)).positions;
}

/**
 * Total portfolio value (USDC) for a wallet (spec §5.3). Best-effort headline
 * figure: the endpoint returns `[{ user, value }]`. Returns null on failure or
 * an unparseable payload, so the dashboard can fall back to summed positions.
 */
export async function getPortfolioValue(
  address: string,
): Promise<number | null> {
  const params = new URLSearchParams({ user: address });
  try {
    const res = await fetchJson<DataValue[] | DataValue>(
      `${DATA_API_BASE}/value?${params.toString()}`,
      { cacheTtlMs: 60_000 },
    );
    const raw = Array.isArray(res) ? res[0]?.value : res?.value;
    const value = Number(String(raw));
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
