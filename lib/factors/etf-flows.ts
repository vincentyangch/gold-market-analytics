import type { FactorResult } from "@/lib/types";

interface EtfFlowsInput {
  currentPrice: number;
  previousPrice: number;
  currentVolume: number;
  averageVolume: number;
}

export function computeEtfFlows(input: EtfFlowsInput): FactorResult {
  const { currentPrice, previousPrice, currentVolume, averageVolume } = input;

  const priceChange = (currentPrice - previousPrice) / previousPrice;
  const volumeRatio = currentVolume / averageVolume;

  // Rising price + above-average volume = bullish inflows
  // Falling price + above-average volume = bearish outflows
  // Low volume = weak signal either way
  const volumeMultiplier = Math.min(2, volumeRatio) / 2; // 0 to 1
  const raw = priceChange * 10 * volumeMultiplier; // scale price change
  const score = Math.max(-1, Math.min(1, raw));

  const flowDirection = score > 0 ? "net inflows" : "net outflows";

  return {
    name: "ETF Capital Flows",
    score,
    weight: 0.15,
    reasoning: `GLD showing ${flowDirection} (volume ${volumeRatio.toFixed(1)}x average)`,
  };
}
