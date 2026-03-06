"use client";

import type { Quote } from "@/lib/types";

interface PriceCardProps {
  quote: Quote;
  label: string;
}

export function PriceCard({ quote, label }: PriceCardProps) {
  const isPositive = quote.change >= 0;

  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <div className="text-sm text-secondary mb-1">{label}</div>
      <div className="text-2xl font-bold text-foreground">
        ${quote.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
      <div
        className={`text-sm font-medium mt-1 ${
          isPositive ? "text-bullish" : "text-bearish"
        }`}
      >
        {isPositive ? "+" : ""}
        {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
        {quote.changePercent.toFixed(2)}%)
      </div>
      <div className="text-xs text-secondary mt-2">
        H: ${quote.high.toFixed(2)} L: ${quote.low.toFixed(2)}
      </div>
    </div>
  );
}
