import { describe, expect, it } from "vitest";

import {
  isValidWalletAddress,
  summarizePortfolio,
  type PortfolioPosition,
} from "./portfolio";

describe("summarizePortfolio", () => {
  it("aggregates value, cost basis and cash P&L across positions", () => {
    const positions: PortfolioPosition[] = [
      { initialValue: 100, currentValue: 130, cashPnl: 30 },
      { initialValue: 200, currentValue: 180, cashPnl: -20 },
    ];
    const s = summarizePortfolio(positions);
    expect(s.totalValue).toBeCloseTo(310, 6);
    expect(s.totalCostBasis).toBeCloseTo(300, 6);
    expect(s.totalCashPnl).toBeCloseTo(10, 6);
    expect(s.openPositions).toBe(2);
  });

  it("computes total percent P&L as cash P&L over cost basis", () => {
    const positions: PortfolioPosition[] = [
      { initialValue: 400, currentValue: 500, cashPnl: 100 },
    ];
    // 100 / 400 = 0.25 (a 0..1 fraction; the UI multiplies by 100)
    expect(summarizePortfolio(positions).totalPercentPnl).toBeCloseTo(0.25, 6);
  });

  it("computes win rate over positions with non-zero P&L", () => {
    const positions: PortfolioPosition[] = [
      { initialValue: 100, currentValue: 120, cashPnl: 20 }, // win
      { initialValue: 100, currentValue: 90, cashPnl: -10 }, // loss
      { initialValue: 100, currentValue: 140, cashPnl: 40 }, // win
    ];
    expect(summarizePortfolio(positions).winRate).toBeCloseTo(2 / 3, 6);
  });

  it("ignores break-even positions when computing win rate", () => {
    const positions: PortfolioPosition[] = [
      { initialValue: 100, currentValue: 120, cashPnl: 20 }, // win
      { initialValue: 100, currentValue: 100, cashPnl: 0 }, // flat, excluded
    ];
    expect(summarizePortfolio(positions).winRate).toBe(1);
  });

  it("returns null win rate and null percent for an empty portfolio", () => {
    const s = summarizePortfolio([]);
    expect(s).toEqual({
      totalValue: 0,
      totalCostBasis: 0,
      totalCashPnl: 0,
      totalPercentPnl: null,
      winRate: null,
      openPositions: 0,
    });
  });

  it("returns null percent P&L when there is no cost basis", () => {
    const positions: PortfolioPosition[] = [
      { initialValue: 0, currentValue: 50, cashPnl: 50 },
    ];
    expect(summarizePortfolio(positions).totalPercentPnl).toBeNull();
  });

  it("skips non-finite fields without poisoning the totals", () => {
    const positions: PortfolioPosition[] = [
      { initialValue: 100, currentValue: 130, cashPnl: 30 },
      { initialValue: Number.NaN, currentValue: Number.NaN, cashPnl: Number.NaN },
    ];
    const s = summarizePortfolio(positions);
    expect(s.totalValue).toBeCloseTo(130, 6);
    expect(s.totalCashPnl).toBeCloseTo(30, 6);
    expect(s.winRate).toBe(1); // only the finite, profitable position counts
  });
});

describe("isValidWalletAddress", () => {
  it("accepts a 0x-prefixed 40-hex address (any case)", () => {
    expect(
      isValidWalletAddress("0xdb859a551fcf56e49416160911476bea7307152f"),
    ).toBe(true);
    expect(
      isValidWalletAddress("0xDB859A551FCF56E49416160911476BEA7307152F"),
    ).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(
      isValidWalletAddress("  0xdb859a551fcf56e49416160911476bea7307152f  "),
    ).toBe(true);
  });

  it("rejects wrong length, missing prefix and non-hex input", () => {
    expect(isValidWalletAddress("0x123")).toBe(false); // too short
    expect(isValidWalletAddress("db859a551fcf56e49416160911476bea7307152f")).toBe(
      false,
    ); // no 0x
    expect(
      isValidWalletAddress("0xzz859a551fcf56e49416160911476bea7307152f"),
    ).toBe(false); // non-hex
    expect(isValidWalletAddress("")).toBe(false);
  });
});
