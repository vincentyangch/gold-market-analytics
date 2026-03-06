"use client";

import { useQuotes, useFactors, useLatestReport } from "@/lib/hooks/useMarketData";
import { PriceCard } from "@/components/dashboard/PriceCard";
import { TrendSignal } from "@/components/dashboard/TrendSignal";
import { FactorBreakdown } from "@/components/dashboard/FactorBreakdown";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { ReportCard } from "@/components/dashboard/ReportCard";

const PRICE_LABELS: Record<string, string> = {
  "GC=F": "Gold Futures",
  "SI=F": "Silver Futures",
  "DX-Y.NYB": "US Dollar Index",
  "^VIX": "VIX Volatility",
  GLD: "SPDR Gold ETF",
};

export default function Dashboard() {
  const { data: quotesData, isLoading: quotesLoading } = useQuotes();
  const { data: signal, isLoading: signalLoading } = useFactors();
  const { data: report } = useLatestReport();

  if (quotesLoading || signalLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-secondary">Loading market data...</div>
      </div>
    );
  }

  const quotes = quotesData?.quotes ?? [];

  return (
    <div className="space-y-4">
      {/* Row 1: Price cards + Trend Signal */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
        {/* Price cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {quotes.map((quote) => (
            <PriceCard
              key={quote.symbol}
              quote={quote}
              label={PRICE_LABELS[quote.symbol] ?? quote.symbol}
            />
          ))}
        </div>
        {/* Trend signal — prominent on the right */}
        {signal && (
          <div className="lg:w-56">
            <TrendSignal signal={signal} />
          </div>
        )}
      </div>

      {/* Row 2: Chart + Factor Breakdown sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <PriceChart />
        {signal && <FactorBreakdown factors={signal.factors} />}
      </div>

      {/* Row 3: AI Report */}
      <ReportCard report={report ?? null} />
    </div>
  );
}
