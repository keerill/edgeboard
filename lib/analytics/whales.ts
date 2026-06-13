// Whale detection + per-wallet aggregation (spec §0.5, §7.4). Pure functions on
// plain numbers — no Prisma/Decimal coupling, so they are trivially unit-tested.

/**
 * A trade is a "whale" move when its USDC notional meets the threshold.
 * Boundary is inclusive (>=): a trade exactly at the threshold counts.
 */
export function isWhale(sizeUsdc: number, threshold: number): boolean {
  return Number.isFinite(sizeUsdc) && sizeUsdc >= threshold;
}

export interface WalletVolumeTrade {
  wallet: string;
  sizeUsdc: number;
  ts: Date;
}

export interface WalletVolume {
  wallet: string;
  totalVolumeUsdc: number;
  lastActive: Date;
}

/**
 * Sum USDC volume and find the most recent activity per wallet. Returns one
 * row per wallet, unordered (caller sorts/persists).
 */
export function aggregateByWallet(trades: WalletVolumeTrade[]): WalletVolume[] {
  const byWallet = new Map<string, WalletVolume>();
  for (const t of trades) {
    if (!t.wallet || !Number.isFinite(t.sizeUsdc)) continue;
    const current = byWallet.get(t.wallet);
    if (current) {
      current.totalVolumeUsdc += t.sizeUsdc;
      if (t.ts > current.lastActive) current.lastActive = t.ts;
    } else {
      byWallet.set(t.wallet, {
        wallet: t.wallet,
        totalVolumeUsdc: t.sizeUsdc,
        lastActive: t.ts,
      });
    }
  }
  return [...byWallet.values()];
}
