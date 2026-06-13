// Shapes for the Polymarket public read APIs we consume in Phase 2.
// Fields are intentionally loose/optional: the live Gamma payload varies and
// several array fields arrive as JSON-encoded strings (see parseJsonArray).

export interface GammaMarket {
  id?: string;
  conditionId?: string;
  slug?: string;
  question?: string;
  category?: string;
  /** YES = [0], NO = [1]. May be a JSON string or a real array. */
  clobTokenIds?: string | string[];
  /** ["Yes","No"]. May be a JSON string or a real array. */
  outcomes?: string | string[];
  /** ["0.55","0.45"] aligned with outcomes. May be a JSON string or array. */
  outcomePrices?: string | string[];
  volume?: string | number;
  volumeNum?: number;
  liquidity?: string | number;
  liquidityNum?: number;
  closed?: boolean;
  active?: boolean;
  endDate?: string;
}

/** CLOB GET /midpoint response. */
export interface ClobMidpoint {
  mid?: string;
}

/**
 * Gamma returns some array fields as JSON-encoded strings (e.g.
 * '["123","456"]') and sometimes as real arrays. Normalize both to string[].
 */
export function parseJsonArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}
