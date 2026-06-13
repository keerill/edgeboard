// Portfolio summary + wallet-address validation (spec §0.5, §8 dashboard).
// Pure functions on plain numbers — no Prisma/Decimal coupling, unit-tested in
// portfolio.test.ts.
//
// Method: the dashboard trusts the Data API's per-position cost basis and P&L
// (`initialValue`, `currentValue`, `cashPnl`) directly — these are Polymarket's
// authoritative figures, unlike the whale-only FIFO estimate in computePnl().
// We only aggregate across a wallet's positions here.

export interface PortfolioPosition {
  /** Cost basis in USDC. */
  initialValue: number;
  /** Current value in USDC. */
  currentValue: number;
  /** P&L in USDC (current - cost, including realized). */
  cashPnl: number;
}

export interface PortfolioSummary {
  /** Sum of current values across positions. */
  totalValue: number;
  /** Sum of cost basis across positions. */
  totalCostBasis: number;
  /** Sum of cash P&L across positions. */
  totalCashPnl: number;
  /** totalCashPnl / totalCostBasis as a 0..1 fraction; null if no cost basis. */
  totalPercentPnl: number | null;
  /** Positions in profit / positions with non-zero P&L; null if none closed. */
  winRate: number | null;
  /** Number of positions held. */
  openPositions: number;
}

/** Aggregate a wallet's positions into the dashboard summary metrics. */
export function summarizePortfolio(
  positions: PortfolioPosition[],
): PortfolioSummary {
  let totalValue = 0;
  let totalCostBasis = 0;
  let totalCashPnl = 0;
  let decided = 0; // positions with a non-zero (win or loss) P&L
  let winners = 0;

  for (const p of positions) {
    if (Number.isFinite(p.currentValue)) totalValue += p.currentValue;
    if (Number.isFinite(p.initialValue)) totalCostBasis += p.initialValue;
    if (Number.isFinite(p.cashPnl)) {
      totalCashPnl += p.cashPnl;
      if (p.cashPnl > 0) {
        decided += 1;
        winners += 1;
      } else if (p.cashPnl < 0) {
        decided += 1;
      }
    }
  }

  return {
    totalValue,
    totalCostBasis,
    totalCashPnl,
    totalPercentPnl: totalCostBasis > 0 ? totalCashPnl / totalCostBasis : null,
    winRate: decided > 0 ? winners / decided : null,
    openPositions: positions.length,
  };
}

// Ethereum-style address: 0x + 40 hex chars. Proxy wallets and EOAs both match.
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** True when `addr` is a syntactically valid public wallet address. */
export function isValidWalletAddress(addr: string): boolean {
  return ADDRESS_RE.test(addr.trim());
}
