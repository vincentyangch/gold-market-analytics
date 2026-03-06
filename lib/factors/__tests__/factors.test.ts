import { describe, it, expect } from "vitest";
import { computeRealInterest } from "../real-interest";
import { computeVix } from "../vix";
import { computeEtfFlows } from "../etf-flows";

describe("Real Interest Rate factor", () => {
  it("returns bullish score when real rate is negative", () => {
    const result = computeRealInterest({ realRate: -1.5 });
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.25);
    expect(result.name).toBe("Real Interest Rate");
  });

  it("returns bearish score when real rate is high positive", () => {
    const result = computeRealInterest({ realRate: 3.0 });
    expect(result.score).toBeLessThan(0);
  });

  it("clamps score to -1..+1", () => {
    const veryNeg = computeRealInterest({ realRate: -10 });
    expect(veryNeg.score).toBe(1);
    const veryPos = computeRealInterest({ realRate: 10 });
    expect(veryPos.score).toBe(-1);
  });
});

describe("VIX factor", () => {
  it("returns bullish when VIX is high (fear)", () => {
    const result = computeVix({ vix: 35 });
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.15);
  });

  it("returns bearish when VIX is low (complacency)", () => {
    const result = computeVix({ vix: 12 });
    expect(result.score).toBeLessThan(0);
  });
});

describe("ETF Flows factor", () => {
  it("returns bullish when volume and price are both rising", () => {
    const result = computeEtfFlows({
      currentPrice: 250,
      previousPrice: 245,
      currentVolume: 12000000,
      averageVolume: 8000000,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.15);
  });

  it("returns bearish when volume rising but price falling", () => {
    const result = computeEtfFlows({
      currentPrice: 240,
      previousPrice: 250,
      currentVolume: 12000000,
      averageVolume: 8000000,
    });
    expect(result.score).toBeLessThan(0);
  });
});
