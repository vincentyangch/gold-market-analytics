"use client";

import useSWR, { mutate } from "swr";
import type { Quote, CompositeSignal, MarketReport, OHLCV } from "@/lib/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  // Notify header of successful data refresh
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("market-data-refreshed"));
  }
  return data;
};

const COMMON_OPTS = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

export function useQuotes() {
  return useSWR<{ quotes: Quote[] }>("/api/market/quotes", fetcher, {
    ...COMMON_OPTS,
    refreshInterval: 60_000, // 1 minute
  });
}

export function useHistory(symbol: string, timeframe: string) {
  return useSWR<{ history: OHLCV[] }>(
    `/api/market/history?symbol=${symbol}&timeframe=${timeframe}`,
    fetcher,
    {
      ...COMMON_OPTS,
      refreshInterval: 300_000, // 5 minutes
    }
  );
}

export function useFactors() {
  return useSWR<CompositeSignal>("/api/factors", fetcher, {
    ...COMMON_OPTS,
    refreshInterval: 120_000, // 2 minutes
  });
}

export function useLatestReport() {
  return useSWR<MarketReport>("/api/reports/latest", fetcher, {
    ...COMMON_OPTS,
    refreshInterval: 1_800_000, // 30 minutes
  });
}

/** Force-refresh all data from the server */
export function refreshAll() {
  mutate("/api/market/quotes");
  mutate("/api/factors");
  mutate("/api/reports/latest");
  // History keys are dynamic (symbol+timeframe), use regex match
  mutate((key: string) => typeof key === "string" && key.startsWith("/api/market/history"));
}
