"use client";

import type { FactorResult } from "@/lib/types";
import { FactorCard } from "./FactorCard";

interface FactorBreakdownProps {
  factors: FactorResult[];
}

export function FactorBreakdown({ factors }: FactorBreakdownProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">
        Factor Breakdown
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {factors.map((factor) => (
          <FactorCard key={factor.name} factor={factor} />
        ))}
      </div>
    </div>
  );
}
