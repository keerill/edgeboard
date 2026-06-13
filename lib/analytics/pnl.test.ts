import { describe, expect, it } from "vitest";

import { computePnl, type PnlTrade } from "./pnl";

describe("computePnl", () => {
  it("realizes profit on a buy-low / sell-high round trip", () => {
    const trades: PnlTrade[] = [
      { asset: "YES", side: "buy", shares: 100, price: 0.4 },
      { asset: "YES", side: "sell", shares: 100, price: 0.6 },
    ];
    const { realizedPnl, winRate } = computePnl(trades);
    expect(realizedPnl).toBeCloseTo(20, 6); // 100 * (0.6 - 0.4)
    expect(winRate).toBe(1);
  });

  it("matches sells FIFO across multiple buy lots", () => {
    const trades: PnlTrade[] = [
      { asset: "YES", side: "buy", shares: 50, price: 0.2 },
      { asset: "YES", side: "buy", shares: 50, price: 0.4 },
      { asset: "YES", side: "sell", shares: 100, price: 0.5 },
    ];
    // 50*(0.5-0.2) + 50*(0.5-0.4) = 15 + 5
    expect(computePnl(trades).realizedPnl).toBeCloseTo(20, 6);
  });

  it("computes win rate across mixed winning and losing sells", () => {
    const trades: PnlTrade[] = [
      { asset: "YES", side: "buy", shares: 100, price: 0.5 },
      { asset: "YES", side: "sell", shares: 100, price: 0.7 }, // win
      { asset: "NO", side: "buy", shares: 100, price: 0.5 },
      { asset: "NO", side: "sell", shares: 100, price: 0.3 }, // loss
    ];
    const { realizedPnl, winRate } = computePnl(trades);
    expect(realizedPnl).toBeCloseTo(0, 6); // +20 - 20
    expect(winRate).toBe(0.5);
  });

  it("keeps assets separate (YES sells do not consume NO buys)", () => {
    const trades: PnlTrade[] = [
      { asset: "NO", side: "buy", shares: 100, price: 0.9 },
      { asset: "YES", side: "buy", shares: 100, price: 0.1 },
      { asset: "YES", side: "sell", shares: 100, price: 0.3 },
    ];
    expect(computePnl(trades).realizedPnl).toBeCloseTo(20, 6); // only YES lot
  });

  it("returns null win rate when nothing is closed", () => {
    const trades: PnlTrade[] = [
      { asset: "YES", side: "buy", shares: 100, price: 0.4 },
    ];
    expect(computePnl(trades)).toEqual({ realizedPnl: 0, winRate: null });
  });

  it("ignores sells with no matching open buys", () => {
    const trades: PnlTrade[] = [
      { asset: "YES", side: "sell", shares: 100, price: 0.5 },
    ];
    expect(computePnl(trades)).toEqual({ realizedPnl: 0, winRate: null });
  });
});
