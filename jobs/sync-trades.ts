// Ingestion job: pull recent large ("whale") trades for the top-N markets and
// insert them into `trades` (spec §7.3). We filter by USDC notional server-side
// (Data API filterType=CASH) so every stored trade is a whale. Idempotent via a
// unique dedupeKey + createMany(skipDuplicates); bounded top-N + small
// concurrency to respect rate limits (429s back off in fetchJson).

import { prisma } from "@/lib/db/prisma";
import { getWhaleTrades } from "@/lib/polymarket/data";
import type { DataTrade } from "@/lib/polymarket/types";
import { isWhale } from "@/lib/analytics/whales";

const TRADE_MARKET_LIMIT = 50;
const TRADES_PER_MARKET = 100;
const CONCURRENCY = 4;
const DEFAULT_WHALE_THRESHOLD = 5000;

export interface SyncTradesResult {
  created: number;
  skipped: number;
}

function whaleThreshold(): number {
  const n = Number(process.env.WHALE_THRESHOLD_USDC);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WHALE_THRESHOLD;
}

function toNumber(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeSide(side: string | undefined): "buy" | "sell" | null {
  const s = side?.toLowerCase();
  return s === "buy" || s === "sell" ? s : null;
}

/** Data API timestamps are unix seconds; tolerate ms just in case. */
function parseTimestamp(value: string | number | undefined): Date | null {
  const n = toNumber(value);
  if (n === null || n <= 0) return null;
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms);
}

type TradeRow = {
  marketId: string;
  wallet: string;
  side: "buy" | "sell";
  sizeUsdc: number;
  price: number;
  isWhale: boolean;
  ts: Date;
  asset: string | null;
  outcome: string | null;
  txHash: string | null;
  dedupeKey: string;
};

/** Map a raw Data API trade into a DB row, or null if it can't be used. */
function toRow(
  marketId: string,
  t: DataTrade,
  threshold: number,
): TradeRow | null {
  const wallet = t.proxyWallet?.toLowerCase();
  const side = normalizeSide(t.side);
  const price = toNumber(t.price);
  const ts = parseTimestamp(t.timestamp);
  if (!wallet || !side || price === null || ts === null) return null;

  const shares = toNumber(t.size);
  const sizeUsdc =
    toNumber(t.usdcSize) ?? (shares !== null ? shares * price : null);
  if (sizeUsdc === null) return null;

  // Stable key so re-runs upsert the same physical trade instead of duplicating.
  const dedupeKey = [
    t.transactionHash ?? "0x0",
    t.asset ?? "",
    side,
    wallet,
    String(t.timestamp ?? ""),
    String(t.size ?? t.usdcSize ?? ""),
  ].join(":");

  return {
    marketId,
    wallet,
    side,
    sizeUsdc,
    price,
    isWhale: isWhale(sizeUsdc, threshold),
    ts,
    asset: t.asset ?? null,
    outcome: t.outcome ?? null,
    txHash: t.transactionHash ?? null,
    dedupeKey,
  };
}

export async function syncTrades(): Promise<SyncTradesResult> {
  const threshold = whaleThreshold();

  const markets = await prisma.market.findMany({
    where: { closed: false, conditionId: { not: "" } },
    orderBy: { volume: "desc" },
    take: TRADE_MARKET_LIMIT,
    select: { id: true, conditionId: true },
  });

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < markets.length; i += CONCURRENCY) {
    const batch = markets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (market) => {
        const trades = await getWhaleTrades(market.conditionId, threshold, {
          limit: TRADES_PER_MARKET,
        });

        const rows: TradeRow[] = [];
        for (const t of trades) {
          const row = toRow(market.id, t, threshold);
          if (row) rows.push(row);
          else skipped += 1;
        }

        if (rows.length === 0) return;
        const result = await prisma.trade.createMany({
          data: rows,
          skipDuplicates: true,
        });
        created += result.count;
      }),
    );
  }

  return { created, skipped };
}
