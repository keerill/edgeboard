import { describe, expect, it } from "vitest";

import {
  marketAlertMessage,
  matchWhaleTrades,
  priceSwingMessage,
  priceSwingPoints,
  shouldFireMarketAlert,
  shouldFirePriceSwing,
  whaleAlertMessage,
  type WhaleTradeInput,
} from "./evaluate";

function trade(over: Partial<WhaleTradeInput>): WhaleTradeInput {
  return {
    marketId: "m1",
    wallet: "0xaaaa",
    side: "buy",
    sizeUsdc: 10_000,
    price: 0.5,
    outcome: "Yes",
    ts: new Date("2026-06-13T12:00:00.000Z"),
    ...over,
  };
}

describe("matchWhaleTrades", () => {
  const since = new Date("2026-06-13T11:00:00.000Z");

  it("keeps only trades strictly newer than the watermark", () => {
    const trades = [
      trade({ ts: new Date("2026-06-13T10:00:00.000Z") }), // older
      trade({ ts: new Date("2026-06-13T11:00:00.000Z") }), // equal → excluded
      trade({ ts: new Date("2026-06-13T12:00:00.000Z") }), // newer
    ];
    const matched = matchWhaleTrades(
      { marketId: null, wallet: null, minUsdc: 5000 },
      trades,
      since,
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].ts.toISOString()).toBe("2026-06-13T12:00:00.000Z");
  });

  it("filters by market, wallet, and minimum USDC", () => {
    const trades = [
      trade({ marketId: "m1", wallet: "0xAAA", sizeUsdc: 9000 }),
      trade({ marketId: "m2", wallet: "0xAAA", sizeUsdc: 9000 }), // wrong market
      trade({ marketId: "m1", wallet: "0xBBB", sizeUsdc: 9000 }), // wrong wallet
      trade({ marketId: "m1", wallet: "0xAAA", sizeUsdc: 4000 }), // under min
    ];
    const matched = matchWhaleTrades(
      { marketId: "m1", wallet: "0xaaa", minUsdc: 5000 },
      trades,
      since,
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].sizeUsdc).toBe(9000);
  });

  it("sorts matches newest first", () => {
    const trades = [
      trade({ ts: new Date("2026-06-13T11:30:00.000Z"), sizeUsdc: 6000 }),
      trade({ ts: new Date("2026-06-13T11:45:00.000Z"), sizeUsdc: 7000 }),
    ];
    const matched = matchWhaleTrades(
      { marketId: null, wallet: null, minUsdc: 5000 },
      trades,
      since,
    );
    expect(matched.map((t) => t.sizeUsdc)).toEqual([7000, 6000]);
  });
});

describe("priceSwingPoints", () => {
  it("returns the signed window-start → latest move in percentage points", () => {
    const swing = priceSwingPoints([
      { price: 0.4, ts: new Date("2026-06-13T10:00:00.000Z") },
      { price: 0.55, ts: new Date("2026-06-13T11:00:00.000Z") },
    ]);
    expect(swing).toBeCloseTo(15, 6);
  });

  it("is negative when the price falls and tolerates unordered input", () => {
    const swing = priceSwingPoints([
      { price: 0.5, ts: new Date("2026-06-13T11:00:00.000Z") },
      { price: 0.6, ts: new Date("2026-06-13T10:00:00.000Z") }, // earlier
    ]);
    expect(swing).toBeCloseTo(-10, 6);
  });

  it("returns null with fewer than two finite snapshots", () => {
    expect(priceSwingPoints([])).toBeNull();
    expect(
      priceSwingPoints([{ price: 0.5, ts: new Date("2026-06-13T10:00:00Z") }]),
    ).toBeNull();
  });
});

describe("shouldFirePriceSwing", () => {
  const now = new Date("2026-06-13T12:00:00.000Z");
  const cooldown = 60 * 60 * 1000;

  it("fires when the absolute move meets the threshold", () => {
    expect(shouldFirePriceSwing(5, 6, null, now, cooldown)).toBe(true);
    expect(shouldFirePriceSwing(5, -6, null, now, cooldown)).toBe(true);
  });

  it("does not fire below threshold or with no swing", () => {
    expect(shouldFirePriceSwing(5, 4.9, null, now, cooldown)).toBe(false);
    expect(shouldFirePriceSwing(5, null, null, now, cooldown)).toBe(false);
  });

  it("respects the cooldown since the last fire", () => {
    const recent = new Date(now.getTime() - 10 * 60 * 1000); // 10m ago
    const old = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
    expect(shouldFirePriceSwing(5, 9, recent, now, cooldown)).toBe(false);
    expect(shouldFirePriceSwing(5, 9, old, now, cooldown)).toBe(true);
  });
});

describe("shouldFireMarketAlert", () => {
  it("fires once when the market is closed and never fired", () => {
    expect(shouldFireMarketAlert({ closed: true }, null)).toBe(true);
  });
  it("does not fire for open markets or after firing once", () => {
    expect(shouldFireMarketAlert({ closed: false }, null)).toBe(false);
    expect(
      shouldFireMarketAlert({ closed: true }, new Date("2026-06-13T00:00:00Z")),
    ).toBe(false);
  });
});

describe("message builders", () => {
  it("summarizes a single whale trade with market link and disclaimer", () => {
    const msg = whaleAlertMessage({
      marketQuestion: "Will X win?",
      marketId: "m1",
      trades: [trade({ sizeUsdc: 12_500 })],
      baseUrl: "https://edgeboard.app",
    });
    expect(msg.subject).toContain("Whale buy");
    expect(msg.subject).toContain("Will X win?");
    expect(msg.text).toContain("$12.5K");
    expect(msg.text).toContain("https://edgeboard.app/markets/m1");
    expect(msg.text).toContain("not financial advice");
  });

  it("counts multiple whale trades in the subject", () => {
    const msg = whaleAlertMessage({
      marketQuestion: null,
      marketId: null,
      trades: [trade({}), trade({}), trade({})],
      baseUrl: null,
    });
    expect(msg.subject).toContain("3 new whale trades");
  });

  it("renders direction for a price swing", () => {
    const up = priceSwingMessage({
      marketQuestion: "Rain tomorrow?",
      marketId: "m2",
      swingPoints: 12,
      latestPrice: 0.62,
      windowHours: 6,
      baseUrl: null,
    });
    expect(up.subject).toContain("+12.0pp");
    expect(up.text).toContain("62.0%");

    const down = priceSwingMessage({
      marketQuestion: null,
      marketId: null,
      swingPoints: -8,
      latestPrice: 0.3,
      windowHours: 6,
      baseUrl: null,
    });
    expect(down.subject).toContain("−8.0pp");
  });

  it("announces a resolved market", () => {
    const msg = marketAlertMessage({
      marketQuestion: "Will X win?",
      marketId: "m1",
      baseUrl: null,
    });
    expect(msg.subject).toContain("Market resolved");
    expect(msg.text).toContain("closed/resolved");
  });
});
