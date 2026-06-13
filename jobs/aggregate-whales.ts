// Ingestion job: recompute per-wallet aggregates in `whale_wallets` from the
// stored whale `trades` (spec §7.4). Volume + last-active are exact; realized
// P&L / win-rate are FIFO estimates over the whale trades we ingest (a wallet's
// smaller fills aren't captured), so the /whales ranking leads with volume.

import { prisma } from "@/lib/db/prisma";
import { aggregateByWallet } from "@/lib/analytics/whales";
import type { WalletVolumeTrade } from "@/lib/analytics/whales";
import { computePnl } from "@/lib/analytics/pnl";
import type { PnlTrade } from "@/lib/analytics/pnl";

export interface AggregateWhalesResult {
  wallets: number;
}

export async function aggregateWhales(): Promise<AggregateWhalesResult> {
  // Oldest-first so the FIFO P&L matcher sees trades in chronological order.
  const trades = await prisma.trade.findMany({
    where: { isWhale: true },
    select: { wallet: true, sizeUsdc: true, price: true, side: true, asset: true, ts: true },
    orderBy: { ts: "asc" },
  });

  const volumeInput: WalletVolumeTrade[] = [];
  const pnlByWallet = new Map<string, PnlTrade[]>();

  for (const t of trades) {
    const sizeUsdc = Number(t.sizeUsdc);
    const price = Number(t.price);
    volumeInput.push({ wallet: t.wallet, sizeUsdc, ts: t.ts });

    // P&L needs the outcome token and a positive price to derive share count.
    if (t.asset && price > 0 && Number.isFinite(sizeUsdc)) {
      const list = pnlByWallet.get(t.wallet) ?? [];
      list.push({
        asset: t.asset,
        side: t.side === "sell" ? "sell" : "buy",
        shares: sizeUsdc / price,
        price,
      });
      pnlByWallet.set(t.wallet, list);
    }
  }

  const volumes = aggregateByWallet(volumeInput);

  let wallets = 0;
  for (const v of volumes) {
    const { realizedPnl, winRate } = computePnl(pnlByWallet.get(v.wallet) ?? []);
    const data = {
      totalVolumeUsdc: v.totalVolumeUsdc,
      realizedPnl,
      winRate,
      lastActive: v.lastActive,
    };
    await prisma.whaleWallet.upsert({
      where: { address: v.wallet },
      create: { address: v.wallet, ...data },
      update: data,
    });
    wallets += 1;
  }

  return { wallets };
}
