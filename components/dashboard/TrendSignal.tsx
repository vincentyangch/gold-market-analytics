"use client";

import type { CompositeSignal } from "@/lib/types";

interface TrendSignalProps {
  signal: CompositeSignal;
}

export function TrendSignal({ signal }: TrendSignalProps) {
  const isUp = signal.direction === "Bullish";
  const isDown = signal.direction === "Bearish";

  const accentColor = isUp
    ? "text-bullish"
    : isDown
      ? "text-bearish"
      : "text-neutral";

  const glowBg = isUp
    ? "bg-bullish/15 shadow-[0_0_24px_rgba(38,217,98,0.25)]"
    : isDown
      ? "bg-bearish/15 shadow-[0_0_24px_rgba(245,64,74,0.25)]"
      : "bg-neutral/10";

  const barBg = isUp
    ? "bg-bullish"
    : isDown
      ? "bg-bearish"
      : "bg-neutral";

  return (
    <div className={`bg-card border border-card-border rounded-lg p-5 flex flex-col items-center justify-center ${glowBg}`}>
      <div className="text-[10px] uppercase tracking-widest text-secondary mb-2">
        Trend Signal
      </div>
      <div className={`text-3xl font-extrabold tracking-tight ${accentColor}`}>
        {signal.direction}
      </div>
      <div className="mt-3 flex items-center gap-5 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-secondary">Score</div>
          <div className={`text-base font-bold font-mono ${accentColor}`}>
            {signal.score > 0 ? "+" : ""}
            {signal.score.toFixed(3)}
          </div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-secondary">Confidence</div>
          <div className="text-base font-bold text-foreground">
            {signal.confidence}%
          </div>
        </div>
      </div>
      {/* Confidence bar */}
      <div className="mt-3 w-full max-w-[160px] h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barBg}`}
          style={{ width: `${signal.confidence}%` }}
        />
      </div>
    </div>
  );
}
