import { describe, it, expect } from "vitest";
import { buildReportPrompt } from "../generate";
import type { CompositeSignal, DataSnapshot } from "@/lib/types";

describe("buildReportPrompt", () => {
  it("includes all data in the prompt", () => {
    const signal: CompositeSignal = {
      direction: "Bullish",
      score: 0.35,
      confidence: 72,
      factors: [
        { name: "Real Interest Rate", score: 0.6, weight: 0.25, reasoning: "Negative real rate" },
        { name: "VIX", score: 0.3, weight: 0.15, reasoning: "Elevated" },
      ],
      computedAt: new Date().toISOString(),
    };
    const snapshot: DataSnapshot = {
      goldPrice: 2650,
      silverPrice: 31.5,
      vix: 22,
      dxy: 104,
      realRate: -1.2,
    };

    const prompt = buildReportPrompt(signal, snapshot);

    expect(prompt).toContain("2650");
    expect(prompt).toContain("Bullish");
    expect(prompt).toContain("72");
    expect(prompt).toContain("Real Interest Rate");
  });
});
