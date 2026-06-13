import { describe, expect, it } from "vitest";

import { aggregateByWallet, isWhale } from "./whales";

describe("isWhale", () => {
  it("flags trades at or above the threshold", () => {
    expect(isWhale(5000, 5000)).toBe(true); // inclusive boundary
    expect(isWhale(7500, 5000)).toBe(true);
  });

  it("rejects trades below the threshold", () => {
    expect(isWhale(4999.99, 5000)).toBe(false);
    expect(isWhale(0, 5000)).toBe(false);
  });

  it("rejects non-finite sizes", () => {
    expect(isWhale(Number.NaN, 5000)).toBe(false);
  });
});

describe("aggregateByWallet", () => {
  it("sums volume and keeps the latest activity per wallet", () => {
    const result = aggregateByWallet([
      { wallet: "0xa", sizeUsdc: 6000, ts: new Date("2026-06-01T00:00:00Z") },
      { wallet: "0xa", sizeUsdc: 4000, ts: new Date("2026-06-03T00:00:00Z") },
      { wallet: "0xb", sizeUsdc: 9000, ts: new Date("2026-06-02T00:00:00Z") },
    ]);
    const byWallet = Object.fromEntries(result.map((r) => [r.wallet, r]));

    expect(byWallet["0xa"].totalVolumeUsdc).toBe(10000);
    expect(byWallet["0xa"].lastActive).toEqual(new Date("2026-06-03T00:00:00Z"));
    expect(byWallet["0xb"].totalVolumeUsdc).toBe(9000);
    expect(result).toHaveLength(2);
  });

  it("returns an empty list for no trades", () => {
    expect(aggregateByWallet([])).toEqual([]);
  });
});
