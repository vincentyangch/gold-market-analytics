import { describe, it, expect } from "vitest";
import { computeComposite } from "../index";
import type { FactorResult } from "@/lib/types";

describe("computeComposite", () => {
  it("returns Bullish when weighted score > 0.15", () => {
    const factors: FactorResult[] = [
      { name: "A", score: 0.8, weight: 0.5, reasoning: "" },
      { name: "B", score: 0.6, weight: 0.3, reasoning: "" },
      { name: "C", score: 0.2, weight: 0.2, reasoning: "" },
    ];
    const result = computeComposite(factors);
    expect(result.direction).toBe("Bullish");
    expect(result.score).toBeCloseTo(0.62);
  });

  it("returns Bearish when weighted score < -0.15", () => {
    const factors: FactorResult[] = [
      { name: "A", score: -0.7, weight: 0.5, reasoning: "" },
      { name: "B", score: -0.4, weight: 0.3, reasoning: "" },
      { name: "C", score: -0.3, weight: 0.2, reasoning: "" },
    ];
    const result = computeComposite(factors);
    expect(result.direction).toBe("Bearish");
    expect(result.score).toBeLessThan(-0.15);
  });

  it("returns Neutral when score is between -0.15 and 0.15", () => {
    const factors: FactorResult[] = [
      { name: "A", score: 0.3, weight: 0.5, reasoning: "" },
      { name: "B", score: -0.3, weight: 0.5, reasoning: "" },
    ];
    const result = computeComposite(factors);
    expect(result.direction).toBe("Neutral");
  });

  it("high factor agreement yields high confidence", () => {
    const factors: FactorResult[] = [
      { name: "A", score: 0.7, weight: 0.33, reasoning: "" },
      { name: "B", score: 0.8, weight: 0.33, reasoning: "" },
      { name: "C", score: 0.6, weight: 0.34, reasoning: "" },
    ];
    const result = computeComposite(factors);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it("mixed factors yield low confidence", () => {
    const factors: FactorResult[] = [
      { name: "A", score: 0.9, weight: 0.33, reasoning: "" },
      { name: "B", score: -0.8, weight: 0.33, reasoning: "" },
      { name: "C", score: 0.1, weight: 0.34, reasoning: "" },
    ];
    const result = computeComposite(factors);
    expect(result.confidence).toBeLessThan(40);
  });
});
