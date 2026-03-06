import YahooFinance from "yahoo-finance2";
import { unstable_cache } from "next/cache";
import type { Quote, OHLCV, Timeframe } from "@/lib/types";

const yf = new YahooFinance();

const SYMBOLS = ["GC=F", "SI=F", "DX-Y.NYB", "^VIX", "GLD"] as const;

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
  "5Y": 1825,
};

async function fetchQuotes(): Promise<Quote[]> {
  const quotes = await Promise.all(
    SYMBOLS.map((symbol) => yf.quote(symbol))
  );

  return quotes.map((q: any) => ({
    symbol: q.symbol,
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePercent: q.regularMarketChangePercent ?? 0,
    high: q.regularMarketDayHigh ?? 0,
    low: q.regularMarketDayLow ?? 0,
    volume: q.regularMarketVolume ?? 0,
    updatedAt: new Date().toISOString(),
  }));
}

export const getQuotes = unstable_cache(fetchQuotes, ["market-quotes"], {
  revalidate: 300, // 5 minutes
});

async function fetchHistory(
  symbol: string,
  timeframe: Timeframe
): Promise<OHLCV[]> {
  const days = TIMEFRAME_DAYS[timeframe];
  const period1 = new Date();
  period1.setDate(period1.getDate() - days);

  const results: any[] = await yf.historical(symbol, {
    period1,
    period2: new Date(),
  });

  return results.map((r: any) => ({
    date: new Date(r.date).toISOString().split("T")[0],
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
  }));
}

export const getHistory = unstable_cache(
  fetchHistory,
  ["market-history"],
  { revalidate: 3600 } // 1 hour
);
