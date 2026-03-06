import { describe, it, expect, vi } from "vitest";
import { computeAllFactors } from "../index";

// Mock next/cache
vi.mock("next/cache", () => ({
  unstable_cache: (fn: Function) => fn,
}));

// Mock data clients
vi.mock("@/lib/data/yahoo", () => ({
  getQuotes: vi.fn().mockResolvedValue([
    { symbol: "GC=F", price: 2650, change: 10, changePercent: 0.38, high: 2660, low: 2640, volume: 150000, updatedAt: "" },
    { symbol: "SI=F", price: 31.5, change: 0.3, changePercent: 0.96, high: 31.8, low: 31.2, volume: 80000, updatedAt: "" },
    { symbol: "DX-Y.NYB", price: 104, change: -0.2, changePercent: -0.19, high: 104.5, low: 103.8, volume: 50000, updatedAt: "" },
    { symbol: "^VIX", price: 22, change: 1.5, changePercent: 7.3, high: 23, low: 20, volume: 0, updatedAt: "" },
    { symbol: "GLD", price: 245, change: 2, changePercent: 0.82, high: 246, low: 243, volume: 10000000, updatedAt: "" },
  ]),
  getHistory: vi.fn().mockResolvedValue(
    Array.from({ length: 50 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      open: 2400 + i * 5,
      high: 2410 + i * 5,
      low: 2395 + i * 5,
      close: 2400 + i * 5,
      volume: 100000,
    }))
  ),
}));

vi.mock("@/lib/data/fred", () => ({
  getMacroData: vi.fn().mockResolvedValue({
    fedFundsRate: 5.33,
    cpi: 314.5,
    treasury10Y: 4.25,
    breakeven5Y: 2.35,
    realRate: 2.98,
  }),
}));

describe("computeAllFactors (orchestrator)", () => {
  it("returns a CompositeSignal with all 6 factors", async () => {
    const signal = await computeAllFactors();

    expect(signal.factors).toHaveLength(6);
    expect(signal.direction).toMatch(/^(Bullish|Bearish|Neutral)$/);
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(100);

    const names = signal.factors.map((f) => f.name);
    expect(names).toContain("Real Interest Rate");
    expect(names).toContain("VIX Volatility");
    expect(names).toContain("ETF Capital Flows");
    expect(names).toContain("Technical Indicators");
    expect(names).toContain("USD Strength");
    expect(names).toContain("Gold/Silver Ratio");

    // Weights sum to 1
    const totalWeight = signal.factors.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });
});
