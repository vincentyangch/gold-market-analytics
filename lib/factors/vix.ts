import type { FactorResult } from "@/lib/types";

interface VixInput {
  vix: number;
}

export function computeVix(input: VixInput): FactorResult {
  const { vix } = input;

  // VIX baseline ~20. High VIX = fear = gold safe haven buying = bullish.
  // Score: (vix - 20) / 20, clamped to -1..+1.
  const raw = (vix - 20) / 20;
  const score = Math.max(-1, Math.min(1, raw));

  const label =
    vix > 25 ? "elevated fear, safe-haven demand" :
    vix < 15 ? "low volatility, risk-on sentiment" :
    "moderate volatility";

  return {
    name: "VIX Volatility",
    score,
    weight: 0.15,
    reasoning: `VIX at ${vix.toFixed(1)} — ${label}`,
  };
}
