import type { FactorResult, OHLCV } from "@/lib/types";

function sma(data: number[], period: number): number {
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function rsi(closes: number[], period = 14): number {
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const recent = changes.slice(-period);
  const gains = recent.filter((c) => c > 0);
  const losses = recent.filter((c) => c < 0).map((c) => Math.abs(c));
  const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 0.001;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeTechnicals(history: OHLCV[]): FactorResult {
  const closes = history.map((h) => h.close);
  const currentPrice = closes[closes.length - 1];

  // Sub-indicators, each scored -1 to +1
  const scores: number[] = [];

  // 1. Price vs 50-period MA
  if (closes.length >= 50) {
    const ma50 = sma(closes, 50);
    scores.push(currentPrice > ma50 ? 0.5 : -0.5);
  }

  // 2. Price vs 200-period MA (use what we have if < 200)
  const maPeriod = Math.min(closes.length, 200);
  const maLong = sma(closes, maPeriod);
  scores.push(currentPrice > maLong ? 0.5 : -0.5);

  // 3. RSI: >60 slightly bullish, >70 overbought (less bullish), <40 bearish, <30 oversold
  if (closes.length >= 15) {
    const rsiValue = rsi(closes);
    if (rsiValue > 70) scores.push(0.2); // overbought, temper bullishness
    else if (rsiValue > 60) scores.push(0.5);
    else if (rsiValue > 40) scores.push(0);
    else if (rsiValue > 30) scores.push(-0.5);
    else scores.push(-0.2); // oversold, temper bearishness
  }

  const avgScore = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;
  const score = Math.max(-1, Math.min(1, avgScore));

  return {
    name: "Technical Indicators",
    score,
    weight: 0.20,
    reasoning: `Price ${currentPrice > maLong ? "above" : "below"} key moving averages, RSI ${closes.length >= 15 ? rsi(closes).toFixed(0) : "N/A"}`,
  };
}
