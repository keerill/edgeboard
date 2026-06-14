// Polymarket API clients (Gamma / CLOB / Data API) live here.
// Phase 2: Gamma (market metadata) + CLOB (prices). Phase 3: Data API (trades).
// Phase 4: Data API positions/value (portfolio).
export { getActiveMarkets } from "./gamma";
export { getMidpoint } from "./clob";
export {
  getWhaleTrades,
  getPositions,
  getPositionsResult,
  getPortfolioValue,
} from "./data";
export { fetchJson } from "./http";
export { parseJsonArray } from "./types";
export type {
  GammaMarket,
  ClobMidpoint,
  DataTrade,
  DataPosition,
  DataValue,
} from "./types";
