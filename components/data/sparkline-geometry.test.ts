import { describe, expect, it } from "vitest";

import { buildSparkline } from "./sparkline-geometry";

describe("buildSparkline", () => {
  it("returns a flat baseline for <2 points", () => {
    expect(buildSparkline([], 100, 30, 1).flat).toBe(true);
    expect(buildSparkline([5], 100, 30, 1).flat).toBe(true);
    expect(buildSparkline([5], 100, 30, 1).baselineY).toBe(15);
  });

  it("maps endpoints to the padded horizontal extents", () => {
    const g = buildSparkline([0, 1], 100, 30, 2);
    expect(g.flat).toBe(false);
    const pts = g.line.split(" ");
    expect(pts).toHaveLength(2);
    expect(pts[0].startsWith("2.00,")).toBe(true); // first x = pad
    expect(pts[1].startsWith("98.00,")).toBe(true); // last x = width - pad
  });

  it("puts the max at the top (low y) and min at the bottom (high y)", () => {
    const g = buildSparkline([1, 5, 3], 100, 30, 2);
    const ys = g.line.split(" ").map((p) => Number(p.split(",")[1]));
    // index 1 is the max → smallest y; index 0 is the min → largest y
    expect(ys[1]).toBeLessThan(ys[2]);
    expect(ys[0]).toBeGreaterThan(ys[1]);
    expect(Math.min(...ys)).toBeCloseTo(2, 5); // top pad
    expect(Math.max(...ys)).toBeCloseTo(28, 5); // height - pad
  });

  it("handles a constant series without dividing by zero", () => {
    const g = buildSparkline([4, 4, 4], 100, 30, 2);
    expect(g.flat).toBe(false);
    const ys = g.line.split(" ").map((p) => Number(p.split(",")[1]));
    expect(ys.every((y) => Number.isFinite(y))).toBe(true);
  });

  it("closes the filled area polygon back along the baseline", () => {
    const g = buildSparkline([1, 2], 100, 30, 2);
    expect(g.area.endsWith("98.00,28.00 2.00,28.00")).toBe(true);
  });
});
