// Ingestion job: snapshot current YES prices from CLOB midpoints into
// `price_snapshots` (spec §7.2). Bounded to the top-N markets by volume and
// run with small concurrency to respect rate limits; 429s back off in fetchJson.

import { prisma } from "@/lib/db/prisma";
import { getMidpoint } from "@/lib/polymarket/clob";

const SNAPSHOT_MARKET_LIMIT = 50;
const CONCURRENCY = 4;

export interface SnapshotPricesResult {
  snapshots: number;
  skipped: number;
}

export async function snapshotPrices(): Promise<SnapshotPricesResult> {
  const markets = await prisma.market.findMany({
    where: { closed: false, clobTokenIdYes: { not: null } },
    orderBy: { volume: "desc" },
    take: SNAPSHOT_MARKET_LIMIT,
    select: { id: true, clobTokenIdYes: true },
  });

  let snapshots = 0;
  let skipped = 0;

  for (let i = 0; i < markets.length; i += CONCURRENCY) {
    const batch = markets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (market) => {
        const tokenId = market.clobTokenIdYes;
        if (!tokenId) {
          skipped += 1;
          return;
        }
        const price = await getMidpoint(tokenId);
        if (price === null) {
          skipped += 1;
          return;
        }
        await prisma.priceSnapshot.create({
          data: { marketId: market.id, tokenId, price },
        });
        snapshots += 1;
      }),
    );
  }

  return { snapshots, skipped };
}
