import type { FactorResult } from "@/lib/types";

interface GoldSilverRatioInput {
  currentRatio: number;
  averageRatio: number; // rolling 1-year average
}

export function computeGoldSilverRatio(
  input: GoldSilverRatioInput
): FactorResult {
  const { currentRatio, averageRatio } = input;

  // High ratio (gold expensive vs silver) historically precedes gold moves.
  // Above average → bullish signal.
  const deviation = (currentRatio - averageRatio) / averageRatio;
  const raw = deviation * 5;
  const score = Math.max(-1, Math.min(1, raw));

  return {
    name: "Gold/Silver Ratio",
    score,
    weight: 0.10,
    reasoning: `Ratio at ${currentRatio.toFixed(1)} (avg ${averageRatio.toFixed(1)}) — ${
      currentRatio > averageRatio ? "silver undervalued" : "ratio compressing"
    }`,
  };
}
