"use client";

import type { FactorResult } from "@/lib/types";
import { FactorCard } from "./FactorCard";

interface FactorBreakdownProps {
  factors: FactorResult[];
}

export function FactorBreakdown({ factors }: FactorBreakdownProps) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">
        Factor Breakdown
      </h2>
      <div className="flex flex-col gap-2">
        {factors.map((factor) => (
          <FactorCard key={factor.name} factor={factor} />
        ))}
      </div>
    </div>
  );
}
