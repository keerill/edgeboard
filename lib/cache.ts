// Generic in-process keyed TTL memo. Same approach as the bespoke memo in
// lib/stats.ts (unstable_cache is unreliable under force-dynamic routes), but
// keyed so several call sites can share it. Per server instance — each
// serverless instance keeps its own copy, which is fine because the ingestion
// crons are the source of truth and every TTL here is <= a cron's cadence, so
// staleness is bounded.
type Entry<T> = { at: number; value: T };

const store = new Map<string, Entry<unknown>>();

export async function cachedTTL<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && now - hit.at < ttlMs) return hit.value;
  const value = await load();
  store.set(key, { at: now, value });
  return value;
}
