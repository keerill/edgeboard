// Thin wrapper around native fetch for Polymarket's public read endpoints.
// Adds: request timeout, retry with exponential backoff on 429/5xx (honoring
// Retry-After), and an optional in-memory TTL cache for GETs (spec §3, §5).

interface FetchJsonOptions {
  /** Max retry attempts after the first try (default 3). */
  retries?: number;
  /** Base backoff delay in ms; doubles each attempt (default 500). */
  baseDelayMs?: number;
  /** Per-request timeout in ms (default 10_000). */
  timeoutMs?: number;
  /** If set, cache the successful JSON for this many ms (keyed by URL). */
  cacheTtlMs?: number;
}

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

// Module-level cache. In serverless this lives per warm instance — good enough
// for the 30–60s TTLs the spec asks for; it is not a correctness dependency.
const cache = new Map<string, CacheEntry>();

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse a Retry-After header (seconds) into ms, or null if absent/invalid. */
function retryAfterMs(res: Response): number | null {
  const header = res.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 500,
    timeoutMs = 10_000,
    cacheTtlMs,
  } = options;

  if (cacheTtlMs) {
    const hit = cache.get(url);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value as T;
    }
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });

      if (RETRYABLE_STATUS.has(res.status) && attempt < retries) {
        const backoff = retryAfterMs(res) ?? baseDelayMs * 2 ** attempt;
        await sleep(backoff);
        continue;
      }

      if (!res.ok) {
        throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
      }

      const value = (await res.json()) as T;
      if (cacheTtlMs) {
        cache.set(url, { expiresAt: Date.now() + cacheTtlMs, value });
      }
      return value;
    } catch (error) {
      lastError = error;
      // Retry transient network/abort errors; otherwise fall through.
      if (attempt < retries) {
        await sleep(baseDelayMs * 2 ** attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`GET ${url} failed after ${retries + 1} attempts`);
}
