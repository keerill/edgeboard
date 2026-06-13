// CLOB API client — read-only prices (spec §5.2). Public, no auth.
// Base: https://clob.polymarket.com (override via CLOB_API_BASE).

import { fetchJson } from "./http";
import type { ClobMidpoint } from "./types";

const CLOB_API_BASE =
  process.env.CLOB_API_BASE ?? "https://clob.polymarket.com";

/**
 * Current midpoint price for an outcome token (0..1). We use the midpoint as
 * the single representative "current price" — it needs no BUY/SELL side and
 * sits between best bid/ask. Returns null when the book is empty or the value
 * is unparseable (caller skips the snapshot). Short TTL cache so repeated reads
 * within a cron run don't re-hit the API.
 */
export async function getMidpoint(tokenId: string): Promise<number | null> {
  const params = new URLSearchParams({ token_id: tokenId });
  try {
    const res = await fetchJson<ClobMidpoint>(
      `${CLOB_API_BASE}/midpoint?${params.toString()}`,
      { cacheTtlMs: 30_000 },
    );
    const mid = res.mid !== undefined ? Number(res.mid) : NaN;
    return Number.isFinite(mid) ? mid : null;
  } catch {
    return null;
  }
}
