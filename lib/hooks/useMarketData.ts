"use client";

import useSWR from "swr";
import type { Quote, CompositeSignal, MarketReport, OHLCV } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useQuotes() {
  return useSWR<{ quotes: Quote[] }>("/api/market/quotes", fetcher, {
    refreshInterval: 60000, // 60 seconds
  });
}

export function useHistory(symbol: string, timeframe: string) {
  return useSWR<{ history: OHLCV[] }>(
    `/api/market/history?symbol=${symbol}&timeframe=${timeframe}`,
    fetcher,
    { refreshInterval: 300000 } // 5 min
  );
}

export function useFactors() {
  return useSWR<CompositeSignal>("/api/factors", fetcher, {
    refreshInterval: 900000, // 15 min
  });
}

export function useLatestReport() {
  return useSWR<MarketReport>("/api/reports/latest", fetcher, {
    refreshInterval: 3600000, // 1 hour
  });
}
