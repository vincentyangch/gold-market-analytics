import type { FactorResult, OHLCV } from "@/lib/types";

export function computeUsdStrength(dxyHistory: OHLCV[]): FactorResult {
  const closes = dxyHistory.map((h) => h.close);
  const current = closes[closes.length - 1];
  const past = closes[0];

  // Trend over the period: rising DXY = bearish for gold
  const change = (current - past) / past;
  // Invert: strong dollar → negative score for gold
  const raw = -change * 10;
  const score = Math.max(-1, Math.min(1, raw));

  const trend = change > 0 ? "strengthening" : "weakening";

  return {
    name: "USD Strength",
    score,
    weight: 0.15,
    reasoning: `Dollar ${trend} (${(change * 100).toFixed(2)}% over period)`,
  };
}
