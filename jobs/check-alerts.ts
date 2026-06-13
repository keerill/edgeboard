// Alert-evaluation job (spec §7-style cron, Phase 7). Loads active alerts owned
// by Pro users (fail-closed on downgrade — §10), evaluates each by type using the
// pure helpers in lib/alerts/evaluate, and delivers via lib/notify. Per-alert
// try/catch so one bad alert can't abort the run. `lastFiredAt` is advanced only
// on a successful send, so a skipped (unconfigured channel) alert re-tries later.

import { prisma } from "@/lib/db/prisma";
import {
  marketAlertMessage,
  matchWhaleTrades,
  priceSwingMessage,
  priceSwingPoints,
  shouldFireMarketAlert,
  shouldFirePriceSwing,
  whaleAlertMessage,
  type AlertMessage,
  type PriceSnapshotInput,
  type WhaleTradeInput,
} from "@/lib/alerts/evaluate";
import { deliver } from "@/lib/notify";

const DEFAULT_WHALE_THRESHOLD = 5000;
const WHALE_SCAN_LIMIT = 50; // newest whale trades scanned per alert
const PRICE_SWING_WINDOW_HOURS = 24; // lookback window for price_swing
const PRICE_SWING_COOLDOWN_MS = 60 * 60 * 1000; // don't re-fire within an hour
const SNAPSHOT_SCAN_LIMIT = 500;

export interface CheckAlertsResult {
  evaluated: number; // alerts processed
  matched: number; // alerts whose condition fired
  sent: number; // notifications delivered
  skipped: number; // matched but channel/recipient not configured
  failed: number; // matched but delivery threw
}

function envWhaleThreshold(): number {
  const n = Number(process.env.WHALE_THRESHOLD_USDC);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WHALE_THRESHOLD;
}

function baseUrl(): string | null {
  const raw = process.env.NEXTAUTH_URL;
  return raw ? raw.replace(/\/$/, "") : null;
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeSide(side: string): "buy" | "sell" {
  return side.toLowerCase() === "sell" ? "sell" : "buy";
}

export async function checkAlerts(): Promise<CheckAlertsResult> {
  const now = new Date();
  const result: CheckAlertsResult = {
    evaluated: 0,
    matched: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  // Only Pro-owned, active alerts (downgrade silently stops firing — §10).
  const alerts = await prisma.alert.findMany({
    where: { active: true, user: { subscription: { plan: "pro" } } },
    include: {
      user: { select: { email: true, telegramChatId: true } },
      market: { select: { id: true, question: true, closed: true } },
    },
  });

  for (const alert of alerts) {
    result.evaluated += 1;
    try {
      const built = await evaluateAlert(alert, now);
      if (!built) continue;
      result.matched += 1;

      const outcome = await deliver({
        channel: alert.channel,
        email: alert.user.email,
        telegramChatId: alert.user.telegramChatId,
        subject: built.subject,
        text: built.text,
      });

      if (outcome.sent) {
        result.sent += 1;
        await prisma.alert.update({
          where: { id: alert.id },
          data: { lastFiredAt: now },
        });
      } else {
        // Not delivered (e.g. channel unconfigured) — leave the watermark so it
        // re-evaluates and notifies once the channel is set up.
        result.skipped += 1;
      }
    } catch {
      result.failed += 1;
    }
  }

  return result;
}

// The shape the evaluator needs from each included alert row. Prisma's row type
// (with the user/market include) is structurally assignable to this.
interface EvalAlert {
  id: string;
  type: "whale_move" | "price_swing" | "market";
  marketId: string | null;
  wallet: string | null;
  threshold: unknown; // Prisma Decimal | null
  createdAt: Date;
  lastFiredAt: Date | null;
  market: { id: string; question: string; closed: boolean } | null;
}

/** Returns the message to send, or null if the alert's condition didn't fire. */
async function evaluateAlert(
  alert: EvalAlert,
  now: Date,
): Promise<AlertMessage | null> {
  if (alert.type === "whale_move") return evaluateWhale(alert);
  if (alert.type === "price_swing") return evaluatePriceSwing(alert, now);
  if (alert.type === "market") return evaluateMarket(alert);
  return null;
}

async function evaluateWhale(alert: EvalAlert): Promise<AlertMessage | null> {
  const since = alert.lastFiredAt ?? alert.createdAt;
  const minUsdc = toNumber(alert.threshold) ?? envWhaleThreshold();

  const rows = await prisma.trade.findMany({
    where: {
      isWhale: true,
      ts: { gt: since },
      ...(alert.marketId ? { marketId: alert.marketId } : {}),
      ...(alert.wallet ? { wallet: alert.wallet } : {}),
    },
    orderBy: { ts: "desc" },
    take: WHALE_SCAN_LIMIT,
    select: {
      marketId: true,
      wallet: true,
      side: true,
      sizeUsdc: true,
      price: true,
      outcome: true,
      ts: true,
    },
  });

  const trades: WhaleTradeInput[] = rows.flatMap((r) => {
    const sizeUsdc = toNumber(r.sizeUsdc);
    const price = toNumber(r.price);
    if (sizeUsdc === null || price === null) return [];
    return [
      {
        marketId: r.marketId,
        wallet: r.wallet,
        side: normalizeSide(r.side),
        sizeUsdc,
        price,
        outcome: r.outcome,
        ts: r.ts,
      },
    ];
  });

  const matched = matchWhaleTrades(
    { marketId: alert.marketId, wallet: alert.wallet, minUsdc },
    trades,
    since,
  );
  if (matched.length === 0) return null;

  return whaleAlertMessage({
    marketQuestion: alert.market?.question ?? null,
    marketId: alert.marketId,
    trades: matched,
    baseUrl: baseUrl(),
  });
}

async function evaluatePriceSwing(
  alert: EvalAlert,
  now: Date,
): Promise<AlertMessage | null> {
  if (!alert.marketId) return null;
  const thresholdPoints = toNumber(alert.threshold);
  if (thresholdPoints === null) return null;

  const cutoff = new Date(
    now.getTime() - PRICE_SWING_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const rows = await prisma.priceSnapshot.findMany({
    where: { marketId: alert.marketId, ts: { gte: cutoff } },
    orderBy: { ts: "asc" },
    take: SNAPSHOT_SCAN_LIMIT,
    select: { price: true, ts: true },
  });

  const snapshots: PriceSnapshotInput[] = rows.flatMap((r) => {
    const price = toNumber(r.price);
    return price === null ? [] : [{ price, ts: r.ts }];
  });

  const swing = priceSwingPoints(snapshots);
  const fire = shouldFirePriceSwing(
    thresholdPoints,
    swing,
    alert.lastFiredAt,
    now,
    PRICE_SWING_COOLDOWN_MS,
  );
  if (!fire || swing === null) return null;

  const latestPrice = snapshots[snapshots.length - 1].price;
  return priceSwingMessage({
    marketQuestion: alert.market?.question ?? null,
    marketId: alert.marketId,
    swingPoints: swing,
    latestPrice,
    windowHours: PRICE_SWING_WINDOW_HOURS,
    baseUrl: baseUrl(),
  });
}

function evaluateMarket(alert: EvalAlert): AlertMessage | null {
  if (!alert.market) return null;
  if (!shouldFireMarketAlert({ closed: alert.market.closed }, alert.lastFiredAt)) {
    return null;
  }
  return marketAlertMessage({
    marketQuestion: alert.market.question,
    marketId: alert.marketId,
    baseUrl: baseUrl(),
  });
}
