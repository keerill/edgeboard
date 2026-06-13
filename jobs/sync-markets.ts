// Ingestion job: pull active markets from Gamma and upsert into `markets`
// (spec §7.1). Also seeds one YES price_snapshot per market from Gamma's
// outcomePrices so /markets shows live prices right after the first sync —
// snapshot-prices (CLOB) then refines the top-N over time.

import { prisma } from "@/lib/db/prisma";
import { getActiveMarkets } from "@/lib/polymarket/gamma";
import { parseJsonArray } from "@/lib/polymarket/types";
import type { GammaMarket } from "@/lib/polymarket/types";

// MVP cap: top markets by volume (§7.1 suggests ~200).
const MARKET_LIMIT = 200;

function toNumber(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseEndDate(value: string | undefined): Date | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms);
}

export interface SyncMarketsResult {
  synced: number;
  snapshots: number;
}

export async function syncMarkets(): Promise<SyncMarketsResult> {
  const markets: GammaMarket[] = await getActiveMarkets({ limit: MARKET_LIMIT });

  let synced = 0;
  let snapshots = 0;

  for (const m of markets) {
    if (!m.conditionId || !m.question) continue;

    const tokenIds = parseJsonArray(m.clobTokenIds);
    const yesToken = tokenIds[0];
    const noToken = tokenIds[1];
    if (!yesToken) continue; // can't track prices without a YES token

    const volume = m.volumeNum ?? toNumber(m.volume) ?? 0;
    const liquidity = m.liquidityNum ?? toNumber(m.liquidity) ?? 0;

    const data = {
      slug: m.slug ?? null,
      question: m.question,
      category: m.category ?? null,
      clobTokenIdYes: yesToken,
      clobTokenIdNo: noToken ?? null,
      volume,
      liquidity,
      closed: m.closed ?? false,
      endDate: parseEndDate(m.endDate),
    };

    const market = await prisma.market.upsert({
      where: { conditionId: m.conditionId },
      create: { conditionId: m.conditionId, ...data },
      update: data,
    });
    synced += 1;

    // Seed a YES-price snapshot from Gamma's outcomePrices (YES = index 0).
    const yesPrice = toNumber(parseJsonArray(m.outcomePrices)[0]);
    if (yesPrice !== null) {
      await prisma.priceSnapshot.create({
        data: { marketId: market.id, tokenId: yesToken, price: yesPrice },
      });
      snapshots += 1;
    }
  }

  return { synced, snapshots };
}
