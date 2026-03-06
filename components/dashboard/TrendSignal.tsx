"use client";

import type { CompositeSignal } from "@/lib/types";

interface TrendSignalProps {
  signal: CompositeSignal;
}

export function TrendSignal({ signal }: TrendSignalProps) {
  const colorClass =
    signal.direction === "Bullish"
      ? "text-bullish border-bullish"
      : signal.direction === "Bearish"
        ? "text-bearish border-bearish"
        : "text-neutral border-neutral";

  const bgClass =
    signal.direction === "Bullish"
      ? "bg-bullish/10"
      : signal.direction === "Bearish"
        ? "bg-bearish/10"
        : "bg-neutral/10";

  return (
    <div className="bg-card border border-card-border rounded-lg p-6 text-center">
      <div className="text-sm text-secondary mb-2">Trend Signal</div>
      <div
        className={`inline-block px-6 py-3 rounded-full border-2 text-2xl font-bold ${colorClass} ${bgClass}`}
      >
        {signal.direction}
      </div>
      <div className="mt-4 flex justify-center gap-8">
        <div>
          <div className="text-xs text-secondary">Score</div>
          <div className="text-lg font-semibold text-foreground">
            {signal.score > 0 ? "+" : ""}
            {signal.score.toFixed(3)}
          </div>
        </div>
        <div>
          <div className="text-xs text-secondary">Confidence</div>
          <div className="text-lg font-semibold text-foreground">
            {signal.confidence}%
          </div>
        </div>
      </div>
      {/* Confidence bar */}
      <div className="mt-3 mx-auto max-w-xs h-2 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            signal.direction === "Bullish"
              ? "bg-bullish"
              : signal.direction === "Bearish"
                ? "bg-bearish"
                : "bg-neutral"
          }`}
          style={{ width: `${signal.confidence}%` }}
        />
      </div>
    </div>
  );
}
