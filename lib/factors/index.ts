import type { FactorResult, CompositeSignal, SignalDirection } from "@/lib/types";

export function computeComposite(factors: FactorResult[]): CompositeSignal {
  // Weighted score
  const score = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

  // Direction
  let direction: SignalDirection = "Neutral";
  if (score > 0.15) direction = "Bullish";
  else if (score < -0.15) direction = "Bearish";

  // Confidence: inverse of score spread (standard deviation)
  const mean = factors.reduce((sum, f) => sum + f.score, 0) / factors.length;
  const variance =
    factors.reduce((sum, f) => sum + (f.score - mean) ** 2, 0) / factors.length;
  const stdDev = Math.sqrt(variance);
  // Map stdDev (0 = perfect agreement, ~1 = max disagreement) to 0-100
  const confidence = Math.round(Math.max(0, Math.min(100, (1 - stdDev) * 100)));

  return {
    direction,
    score: Math.round(score * 1000) / 1000,
    confidence,
    factors,
    computedAt: new Date().toISOString(),
  };
}
