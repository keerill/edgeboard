// Pure alert-evaluation logic (spec §6/§8) — no Prisma/IO so it stays unit-
// testable, in the style of lib/analytics/. The DB reads + delivery live in
// jobs/check-alerts.ts and lib/notify/. Three alert types, each backed by data
// we already ingest:
//   whale_move  → a new whale trade matches the scope (market/wallet/min-USDC)
//   price_swing → scoped market's YES price moved >= threshold percentage-points
//   market      → scoped market closed/resolved (fires once)

import { isWhale } from "../analytics/whales";
import { formatCompactUsd, formatYesPrice, shortenAddress } from "../format";

const DISCLAIMER = "Information only, not financial advice.";
/** How many trades to list in a whale-move message before summarizing. */
const WHALE_PREVIEW = 5;

export interface AlertMessage {
  subject: string;
  text: string;
}

// ---------- whale_move ----------

export interface WhaleTradeInput {
  marketId: string;
  wallet: string; // lowercased
  side: "buy" | "sell";
  sizeUsdc: number;
  price: number; // 0..1
  outcome: string | null;
  ts: Date;
}

export interface WhaleScope {
  /** Restrict to one market, or null for any market. */
  marketId: string | null;
  /** Restrict to one wallet (lowercased), or null for any wallet. */
  wallet: string | null;
  /** Minimum USDC notional (the alert's threshold, or the env whale floor). */
  minUsdc: number;
}

/**
 * Trades strictly newer than `since` that match the whale-move scope, newest
 * first. `since` is the alert's watermark (lastFiredAt ?? createdAt) so each
 * trade notifies at most once.
 */
export function matchWhaleTrades(
  scope: WhaleScope,
  trades: WhaleTradeInput[],
  since: Date,
): WhaleTradeInput[] {
  const sinceMs = since.getTime();
  const walletScope = scope.wallet ? scope.wallet.toLowerCase() : null;

  return trades
    .filter((t) => {
      if (!(t.ts.getTime() > sinceMs)) return false;
      if (scope.marketId && t.marketId !== scope.marketId) return false;
      if (walletScope && t.wallet.toLowerCase() !== walletScope) return false;
      return isWhale(t.sizeUsdc, scope.minUsdc);
    })
    .sort((a, b) => b.ts.getTime() - a.ts.getTime());
}

// ---------- price_swing ----------

export interface PriceSnapshotInput {
  price: number; // YES price 0..1
  ts: Date;
}

/**
 * Signed YES-price move in percentage points across the supplied window
 * (window-start → latest). Callers pass only the lookback window's snapshots.
 * Returns null when there are fewer than two finite snapshots to compare.
 */
export function priceSwingPoints(
  snapshots: PriceSnapshotInput[],
): number | null {
  const clean = snapshots
    .filter((s) => Number.isFinite(s.price))
    .sort((a, b) => a.ts.getTime() - b.ts.getTime());
  if (clean.length < 2) return null;

  const first = clean[0].price;
  const last = clean[clean.length - 1].price;
  return (last - first) * 100;
}

/**
 * Whether a price_swing alert should fire: the absolute move meets the
 * threshold (percentage points) and the per-alert cooldown has elapsed.
 */
export function shouldFirePriceSwing(
  thresholdPoints: number,
  swingPoints: number | null,
  lastFiredAt: Date | null,
  now: Date,
  cooldownMs: number,
): boolean {
  if (swingPoints === null || !Number.isFinite(swingPoints)) return false;
  if (!(Number.isFinite(thresholdPoints) && thresholdPoints > 0)) return false;
  if (Math.abs(swingPoints) < thresholdPoints) return false;
  if (lastFiredAt && now.getTime() - lastFiredAt.getTime() < cooldownMs) {
    return false;
  }
  return true;
}

// ---------- market (resolution/close) ----------

export interface MarketStateInput {
  closed: boolean;
}

/** Fire a market alert once: when the market is closed and it never fired. */
export function shouldFireMarketAlert(
  market: MarketStateInput,
  lastFiredAt: Date | null,
): boolean {
  return market.closed && lastFiredAt === null;
}

// ---------- message builders ----------

function withFooter(baseUrl: string | null, marketId: string | null): string {
  const link =
    baseUrl && marketId
      ? `\n\nView market: ${baseUrl.replace(/\/$/, "")}/markets/${marketId}`
      : "";
  return `${link}\n\n— EdgeBoard. ${DISCLAIMER}`;
}

function marketLabel(question: string | null): string {
  return question && question.trim() ? question.trim() : "a market";
}

export interface WhaleAlertContext {
  marketQuestion: string | null;
  marketId: string | null;
  trades: WhaleTradeInput[]; // matched, newest first
  baseUrl: string | null;
}

export function whaleAlertMessage(ctx: WhaleAlertContext): AlertMessage {
  const { trades } = ctx;
  const top = trades[0];
  // "Any market" alerts span markets, so only name one when scoped to it.
  const suffix = ctx.marketQuestion
    ? ` on ${marketLabel(ctx.marketQuestion)}`
    : "";
  const subject =
    trades.length === 1 && top
      ? `🐋 Whale ${top.side}: ${formatCompactUsd(top.sizeUsdc)}${suffix}`
      : `🐋 ${trades.length} new whale trades${suffix}`;

  const lines = trades.slice(0, WHALE_PREVIEW).map((t) => {
    const outcome = t.outcome ? ` ${t.outcome}` : "";
    return `• ${t.side.toUpperCase()} ${formatCompactUsd(t.sizeUsdc)}${outcome} @ ${formatYesPrice(t.price)} — ${shortenAddress(t.wallet)}`;
  });
  if (trades.length > WHALE_PREVIEW) {
    lines.push(`…and ${trades.length - WHALE_PREVIEW} more.`);
  }

  const text = `${lines.join("\n")}${withFooter(ctx.baseUrl, ctx.marketId)}`;
  return { subject, text };
}

export interface PriceSwingContext {
  marketQuestion: string | null;
  marketId: string | null;
  swingPoints: number; // signed
  latestPrice: number; // 0..1
  windowHours: number;
  baseUrl: string | null;
}

export function priceSwingMessage(ctx: PriceSwingContext): AlertMessage {
  const up = ctx.swingPoints >= 0;
  const arrow = up ? "📈" : "📉";
  const signed = `${up ? "+" : "−"}${Math.abs(ctx.swingPoints).toFixed(1)}pp`;
  const subject = `${arrow} YES ${signed} on ${marketLabel(ctx.marketQuestion)}`;
  const text =
    `YES price moved ${signed} over the last ${ctx.windowHours}h, ` +
    `now ${formatYesPrice(ctx.latestPrice)}.` +
    withFooter(ctx.baseUrl, ctx.marketId);
  return { subject, text };
}

export interface MarketAlertContext {
  marketQuestion: string | null;
  marketId: string | null;
  baseUrl: string | null;
}

export function marketAlertMessage(ctx: MarketAlertContext): AlertMessage {
  const subject = `🏁 Market resolved: ${marketLabel(ctx.marketQuestion)}`;
  const text =
    `This market has closed/resolved on Polymarket.` +
    withFooter(ctx.baseUrl, ctx.marketId);
  return { subject, text };
}
