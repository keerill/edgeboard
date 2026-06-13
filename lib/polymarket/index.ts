// Polymarket API clients (Gamma / CLOB / Data API) live here.
// Phase 2: Gamma (market metadata) + CLOB (prices). Phase 3: Data API (trades).
export { getActiveMarkets } from "./gamma";
export { getMidpoint } from "./clob";
export { getWhaleTrades } from "./data";
export { fetchJson } from "./http";
export { parseJsonArray } from "./types";
export type { GammaMarket, ClobMidpoint, DataTrade } from "./types";
