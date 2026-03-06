"use client";

import type { FactorResult } from "@/lib/types";

interface FactorCardProps {
  factor: FactorResult;
}

export function FactorCard({ factor }: FactorCardProps) {
  // Map score -1..+1 to bar position 0..100
  const barPosition = ((factor.score + 1) / 2) * 100;
  const isPositive = factor.score >= 0;

  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">
          {factor.name}
        </span>
        <span className="text-xs text-secondary">
          {(factor.weight * 100).toFixed(0)}% weight
        </span>
      </div>
      {/* Score bar */}
      <div className="relative h-2 bg-border rounded-full mb-2">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-secondary/50" />
        {/* Score indicator */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${
            isPositive ? "bg-bullish" : "bg-bearish"
          }`}
          style={{ left: `calc(${barPosition}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-secondary">{factor.reasoning}</span>
        <span
          className={`text-xs font-mono font-bold ${
            isPositive ? "text-bullish" : "text-bearish"
          }`}
        >
          {factor.score > 0 ? "+" : ""}
          {factor.score.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
