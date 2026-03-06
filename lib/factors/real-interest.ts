import type { FactorResult } from "@/lib/types";

interface RealInterestInput {
  realRate: number; // fed funds rate - breakeven inflation
}

export function computeRealInterest(input: RealInterestInput): FactorResult {
  const { realRate } = input;

  // Negative real rates are bullish for gold (money loses value).
  // Score: inverse of real rate, scaled so +-3% maps to +-1.
  const raw = -realRate / 3;
  const score = Math.max(-1, Math.min(1, raw));

  const direction = score > 0 ? "negative, favoring gold" : "positive, headwind for gold";

  return {
    name: "Real Interest Rate",
    score,
    weight: 0.25,
    reasoning: `Real rate at ${realRate.toFixed(2)}% — ${direction}`,
  };
}
