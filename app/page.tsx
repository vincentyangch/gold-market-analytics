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
    <div className="space-y-6">
      {/* Price cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {quotes.map((quote) => (
          <PriceCard
            key={quote.symbol}
            quote={quote}
            label={PRICE_LABELS[quote.symbol] ?? quote.symbol}
          />
        ))}
      </div>

      {/* Trend signal */}
      {signal && <TrendSignal signal={signal} />}

      {/* Factor breakdown */}
      {signal && <FactorBreakdown factors={signal.factors} />}

      {/* Price chart */}
      <PriceChart />

      {/* AI Report */}
      <ReportCard report={report ?? null} />
    </div>
  );
}
