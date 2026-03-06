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
    <div className="py-2 border-b border-border last:border-b-0">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-foreground">
          {factor.name}
        </span>
        <span
          className={`text-xs font-mono font-bold ${
            isPositive ? "text-bullish" : "text-bearish"
          }`}
        >
          {factor.score > 0 ? "+" : ""}
          {factor.score.toFixed(2)}
        </span>
      </div>
      {/* Score bar */}
      <div className="relative h-1.5 bg-border rounded-full">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-secondary/50" />
        {/* Score indicator */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${
            isPositive ? "bg-bullish" : "bg-bearish"
          }`}
          style={{ left: `calc(${barPosition}% - 5px)` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-secondary leading-tight truncate">
        {factor.reasoning}
      </div>
    </div>
  );
}
