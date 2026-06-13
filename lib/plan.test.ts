import { describe, expect, it } from "vitest";

import {
  canAddAlert,
  canAddWallet,
  historyCutoff,
  isPro,
  PLAN_LIMITS,
} from "./plan";

describe("isPro", () => {
  it("is true only for the pro plan", () => {
    expect(isPro("pro")).toBe(true);
    expect(isPro("free")).toBe(false);
  });
});

describe("canAddWallet", () => {
  it("lets a free user add their first wallet but not a second", () => {
    expect(canAddWallet("free", 0)).toBe(true);
    expect(canAddWallet("free", 1)).toBe(false);
    expect(canAddWallet("free", 2)).toBe(false);
  });

  it("never blocks a pro user (unlimited wallets)", () => {
    expect(canAddWallet("pro", 0)).toBe(true);
    expect(canAddWallet("pro", 1)).toBe(true);
    expect(canAddWallet("pro", 999)).toBe(true);
  });
});

describe("canAddAlert", () => {
  it("never lets a free user create an alert (Pro-only feature)", () => {
    expect(canAddAlert("free", 0)).toBe(false);
    expect(canAddAlert("free", 5)).toBe(false);
  });

  it("lets a pro user create alerts up to the plan limit", () => {
    expect(canAddAlert("pro", 0)).toBe(true);
    expect(canAddAlert("pro", PLAN_LIMITS.pro.alertsLimit - 1)).toBe(true);
    expect(canAddAlert("pro", PLAN_LIMITS.pro.alertsLimit)).toBe(false);
  });
});

describe("historyCutoff", () => {
  it("returns a 7-day-ago cutoff for free", () => {
    const now = new Date("2026-06-13T12:00:00.000Z");
    const cutoff = historyCutoff("free", now);
    expect(cutoff).not.toBeNull();
    expect(cutoff?.toISOString()).toBe("2026-06-06T12:00:00.000Z");
  });

  it("returns null for pro (full history, no time filter)", () => {
    expect(historyCutoff("pro", new Date("2026-06-13T12:00:00.000Z"))).toBeNull();
  });
});

describe("PLAN_LIMITS", () => {
  it("gives pro the larger feed and the ranking, free neither", () => {
    expect(PLAN_LIMITS.pro.whaleFeedLimit).toBeGreaterThan(
      PLAN_LIMITS.free.whaleFeedLimit,
    );
    expect(PLAN_LIMITS.pro.whaleRanking).toBe(true);
    expect(PLAN_LIMITS.free.whaleRanking).toBe(false);
  });
});
