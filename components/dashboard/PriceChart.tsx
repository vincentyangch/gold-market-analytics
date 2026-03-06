"use client";

import { useEffect, useRef, useState } from "react";
import { useHistory } from "@/lib/hooks/useMarketData";
import type { Timeframe } from "@/lib/types";

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "1Y", "5Y"];

interface PriceChartProps {
  defaultSymbol?: string;
}

export function PriceChart({ defaultSymbol = "GC=F" }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>("3M");
  const { data } = useHistory(symbol, timeframe);

  useEffect(() => {
    if (!chartContainerRef.current || !data?.history?.length) return;

    // Dynamic import for lightweight-charts (client only)
    import("lightweight-charts").then(({ createChart, CandlestickSeries }) => {
      // Clean up previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = createChart(chartContainerRef.current!, {
        layout: {
          background: { color: "transparent" },
          textColor: "var(--foreground)",
        },
        grid: {
          vertLines: { color: "var(--border)" },
          horzLines: { color: "var(--border)" },
        },
        width: chartContainerRef.current!.clientWidth,
        height: 400,
        timeScale: {
          borderColor: "var(--border)",
        },
      });

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "var(--bullish)",
        downColor: "var(--bearish)",
        borderUpColor: "var(--bullish)",
        borderDownColor: "var(--bearish)",
        wickUpColor: "var(--bullish)",
        wickDownColor: "var(--bearish)",
      });

      const chartData = data.history.map((d) => ({
        time: d.date as any,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      candlestickSeries.setData(chartData);
      chart.timeScale().fitContent();
      chartRef.current = chart;

      // Resize handler
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data]);

  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {["GC=F", "SI=F"].map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-3 py-1 rounded text-sm ${
                symbol === s
                  ? "bg-primary text-background font-medium"
                  : "text-secondary hover:bg-hover"
              }`}
            >
              {s === "GC=F" ? "Gold" : "Silver"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 rounded text-xs ${
                timeframe === tf
                  ? "bg-primary text-background font-medium"
                  : "text-secondary hover:bg-hover"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
