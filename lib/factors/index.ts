import type { FactorResult, CompositeSignal, SignalDirection } from "@/lib/types";
import { getQuotes, getHistory } from "@/lib/data/yahoo";
import { getMacroData } from "@/lib/data/fred";
import { computeRealInterest } from "./real-interest";
import { computeVix } from "./vix";
import { computeEtfFlows } from "./etf-flows";
import { computeTechnicals } from "./technicals";
import { computeUsdStrength } from "./usd-strength";
import { computeGoldSilverRatio } from "./gold-silver-ratio";

export function computeComposite(factors: FactorResult[]): CompositeSignal {
  const score = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

  let direction: SignalDirection = "Neutral";
  if (score > 0.15) direction = "Bullish";
  else if (score < -0.15) direction = "Bearish";

  const mean = factors.reduce((sum, f) => sum + f.score, 0) / factors.length;
  const variance =
    factors.reduce((sum, f) => sum + (f.score - mean) ** 2, 0) / factors.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.round(Math.max(0, Math.min(100, (1 - stdDev) * 100)));

  return {
    direction,
    score: Math.round(score * 1000) / 1000,
    confidence,
    factors,
    computedAt: new Date().toISOString(),
  };
}

export async function computeAllFactors(): Promise<CompositeSignal> {
  const [quotes, macro, goldHistory, dxyHistory] = await Promise.all([
    getQuotes(),
    getMacroData(),
    getHistory("GC=F", "3M"),
    getHistory("DX-Y.NYB", "1M"),
  ]);

  const gold = quotes.find((q) => q.symbol === "GC=F")!;
  const silver = quotes.find((q) => q.symbol === "SI=F")!;
  const vix = quotes.find((q) => q.symbol === "^VIX")!;
  const gld = quotes.find((q) => q.symbol === "GLD")!;

  // Compute gold/silver ratio average from history
  const silverHistory = await getHistory("SI=F", "1Y");
  const goldHistoryYear = await getHistory("GC=F", "1Y");
  const ratios = goldHistoryYear.map((g, i) => {
    const s = silverHistory[i];
    return s ? g.close / s.close : gold.price / silver.price;
  });
  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

  // GLD previous price (yesterday from history)
  const gldHistory = await getHistory("GLD", "1W");
  const gldPrevious = gldHistory.length > 1
    ? gldHistory[gldHistory.length - 2].close
    : gld.price;

  const factors: FactorResult[] = [
    computeRealInterest({ realRate: macro.realRate }),
    computeVix({ vix: vix.price }),
    computeEtfFlows({
      currentPrice: gld.price,
      previousPrice: gldPrevious,
      currentVolume: gld.volume,
      averageVolume: gld.volume, // simplified — would ideally use 20-day avg
    }),
    computeTechnicals(goldHistory),
    computeUsdStrength(dxyHistory),
    computeGoldSilverRatio({
      currentRatio: gold.price / silver.price,
      averageRatio: avgRatio,
    }),
  ];

  return computeComposite(factors);
}
