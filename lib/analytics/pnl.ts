// Realized P&L + win rate from a wallet's trades (spec §0.5). Pure functions on
// plain numbers — unit-tested in pnl.test.ts.
//
// Method: FIFO. Each sell is matched against the wallet's earliest open buys of
// the SAME outcome token (`asset`); realized P&L on the matched shares is
// shares * (sellPrice - buyPrice). Trades are processed in chronological order,
// so callers must pass them sorted by time (oldest first).
//
// Caveat: in Phase 3 we only ingest whale-sized trades, so a wallet's smaller
// offsetting fills are absent — these figures are a lower-bound approximation,
// not an exact ledger. The /whales ranking therefore leads with volume.

export interface PnlTrade {
  /** Outcome token id — P&L is matched per asset. */
  asset: string;
  side: "buy" | "sell";
  /** Number of outcome shares. */
  shares: number;
  /** Execution price, 0..1. */
  price: number;
}

interface Lot {
  shares: number;
  price: number;
}

interface PnlResult {
  realizedPnl: number;
  /** Profitable matched sells / total matched sells; null if nothing closed. */
  winRate: number | null;
}

/** Realized P&L and win rate over one wallet's chronologically-ordered trades. */
export function computePnl(trades: PnlTrade[]): PnlResult {
  // FIFO queue of open buy lots, per asset.
  const lots = new Map<string, Lot[]>();
  let realizedPnl = 0;
  let matchedSells = 0;
  let winningSells = 0;

  for (const t of trades) {
    if (!t.asset || !Number.isFinite(t.shares) || !Number.isFinite(t.price)) {
      continue;
    }
    if (t.shares <= 0) continue;

    if (t.side === "buy") {
      const queue = lots.get(t.asset) ?? [];
      queue.push({ shares: t.shares, price: t.price });
      lots.set(t.asset, queue);
      continue;
    }

    // Sell: match against earliest open buys of the same asset.
    const queue = lots.get(t.asset) ?? [];
    let remaining = t.shares;
    let sellRealized = 0;
    let matchedAny = false;

    while (remaining > 0 && queue.length > 0) {
      const lot = queue[0];
      const matched = Math.min(remaining, lot.shares);
      sellRealized += matched * (t.price - lot.price);
      lot.shares -= matched;
      remaining -= matched;
      matchedAny = true;
      if (lot.shares <= 0) queue.shift();
    }

    if (matchedAny) {
      realizedPnl += sellRealized;
      matchedSells += 1;
      if (sellRealized > 0) winningSells += 1;
    }
    // Shares sold beyond open buys (short / un-ingested entry) are ignored.
  }

  return {
    realizedPnl,
    winRate: matchedSells > 0 ? winningSells / matchedSells : null,
  };
}
