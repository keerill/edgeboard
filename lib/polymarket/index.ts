// Polymarket API clients (Gamma / CLOB / Data API) live here.
// Phase 2: Gamma (market metadata) + CLOB (prices). Data API arrives in Phase 4.
export { getActiveMarkets } from "./gamma";
export { getMidpoint } from "./clob";
export { fetchJson } from "./http";
export { parseJsonArray } from "./types";
export type { GammaMarket, ClobMidpoint } from "./types";
