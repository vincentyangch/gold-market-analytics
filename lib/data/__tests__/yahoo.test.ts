import { describe, it, expect, vi, beforeEach } from "vitest";
import { getQuotes, getHistory } from "../yahoo";

// Mock yahoo-finance2
vi.mock("yahoo-finance2", () => ({
  default: {
    quote: vi.fn(),
    historical: vi.fn(),
  },
}));

// Mock next/cache since unstable_cache doesn't exist in vitest
vi.mock("next/cache", () => ({
  unstable_cache: (fn: Function) => fn,
}));

import yahooFinance from "yahoo-finance2";

describe("Yahoo Finance client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getQuotes", () => {
    it("fetches and normalizes quotes for gold and silver", async () => {
      const mockQuote = (symbol: string, price: number) => ({
        symbol,
        regularMarketPrice: price,
        regularMarketChange: 5.0,
        regularMarketChangePercent: 0.19,
        regularMarketDayHigh: price + 10,
        regularMarketDayLow: price - 10,
        regularMarketVolume: 100000,
      });

      vi.mocked(yahooFinance.quote)
        .mockResolvedValueOnce(mockQuote("GC=F", 2650))
        .mockResolvedValueOnce(mockQuote("SI=F", 31.5))
        .mockResolvedValueOnce(mockQuote("DX-Y.NYB", 104.2))
        .mockResolvedValueOnce(mockQuote("^VIX", 18.5))
        .mockResolvedValueOnce(mockQuote("GLD", 245));

      const quotes = await getQuotes();

      expect(quotes).toHaveLength(5);
      expect(quotes[0].symbol).toBe("GC=F");
      expect(quotes[0].price).toBe(2650);
      expect(quotes[1].symbol).toBe("SI=F");
    });
  });

  describe("getHistory", () => {
    it("fetches historical OHLCV data", async () => {
      vi.mocked(yahooFinance.historical).mockResolvedValueOnce([
        {
          date: new Date("2025-01-01"),
          open: 2600,
          high: 2650,
          low: 2590,
          close: 2640,
          volume: 120000,
        },
      ]);

      const history = await getHistory("GC=F", "1M");

      expect(history).toHaveLength(1);
      expect(history[0].close).toBe(2640);
    });
  });
});
