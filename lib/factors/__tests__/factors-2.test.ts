import { describe, it, expect } from "vitest";
import { computeTechnicals } from "../technicals";
import { computeUsdStrength } from "../usd-strength";
import { computeGoldSilverRatio } from "../gold-silver-ratio";
import type { OHLCV } from "@/lib/types";

// Helper: generate price series
function makeSeries(prices: number[]): OHLCV[] {
  return prices.map((p, i) => ({
    date: `2025-01-${String(i + 1).padStart(2, "0")}`,
    open: p - 1,
    high: p + 5,
    low: p - 5,
    close: p,
    volume: 100000,
  }));
}

describe("Technical Indicators factor", () => {
  it("returns bullish when price is above moving averages and RSI is moderate", () => {
    // Uptrending prices: 50 data points rising from 2400 to 2700
    const prices = Array.from({ length: 50 }, (_, i) => 2400 + i * 6);
    const result = computeTechnicals(makeSeries(prices));
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.20);
  });

  it("returns bearish when price is below moving averages", () => {
    // Downtrending prices
    const prices = Array.from({ length: 50 }, (_, i) => 2700 - i * 6);
    const result = computeTechnicals(makeSeries(prices));
    expect(result.score).toBeLessThan(0);
  });
});

describe("USD Strength factor", () => {
  it("returns bearish for gold when USD is trending up", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 0.5);
    const result = computeUsdStrength(makeSeries(prices));
    expect(result.score).toBeLessThan(0); // strong dollar = bearish gold
    expect(result.weight).toBe(0.15);
  });

  it("returns bullish for gold when USD is trending down", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 110 - i * 0.5);
    const result = computeUsdStrength(makeSeries(prices));
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("Gold/Silver Ratio factor", () => {
  it("returns bullish when ratio is above historical average", () => {
    const result = computeGoldSilverRatio({
      currentRatio: 90,
      averageRatio: 80,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.10);
  });

  it("returns bearish when ratio is below historical average", () => {
    const result = computeGoldSilverRatio({
      currentRatio: 70,
      averageRatio: 80,
    });
    expect(result.score).toBeLessThan(0);
  });
});
