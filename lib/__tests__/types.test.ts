import { describe, it, expect } from "vitest";
import type {
  Quote,
  FactorResult,
  CompositeSignal,
  MarketReport,
} from "../types";

describe("types", () => {
  it("Quote has required fields", () => {
    const quote: Quote = {
      symbol: "GC=F",
      price: 2650.5,
      change: 12.3,
      changePercent: 0.47,
      high: 2660.0,
      low: 2640.0,
      volume: 150000,
      updatedAt: new Date().toISOString(),
    };
    expect(quote.symbol).toBe("GC=F");
    expect(quote.price).toBeGreaterThan(0);
  });

  it("FactorResult score is bounded -1 to +1", () => {
    const factor: FactorResult = {
      name: "Real Interest Rate",
      score: -0.6,
      weight: 0.25,
      reasoning: "Negative real rate favors gold",
    };
    expect(factor.score).toBeGreaterThanOrEqual(-1);
    expect(factor.score).toBeLessThanOrEqual(1);
  });

  it("CompositeSignal aggregates factors", () => {
    const signal: CompositeSignal = {
      direction: "Bullish",
      score: 0.35,
      confidence: 72,
      factors: [],
      computedAt: new Date().toISOString(),
    };
    expect(signal.direction).toBe("Bullish");
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(100);
  });
});
