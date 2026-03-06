# Gold Market Analytics — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a precious metals analytics dashboard with real-time pricing, a weighted 6-factor trend signal, and automated AI market reports.

**Architecture:** Monolithic Next.js app with API routes for data fetching, a `/lib/factors` engine for computing the composite signal, Claude API integration for report generation, and a responsive dashboard UI with dark/light theming.

**Tech Stack:** Next.js 15, TypeScript, TailwindCSS, lightweight-charts, SWR, yahoo-finance2, @anthropic-ai/sdk, @vercel/blob, next-themes, vitest

**Design doc:** `docs/plans/2026-03-06-gold-market-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `.env.example`, `.gitignore`, `vitest.config.ts`

**Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Select defaults. This scaffolds the project in the current directory.

**Step 2: Install core dependencies**

```bash
npm install yahoo-finance2 swr next-themes lightweight-charts @anthropic-ai/sdk @vercel/blob
```

**Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Step 4: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

**Step 5: Create `.env.example`**

```
FRED_API_KEY=your_fred_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
CRON_SECRET=your_cron_secret_here
```

**Step 6: Update `.gitignore`**

Append to the existing `.gitignore`:

```
.env
.env.local
```

**Step 7: Verify setup**

```bash
npm run dev
```

Expected: Next.js dev server starts on localhost:3000.

```bash
npx vitest run
```

Expected: vitest runs (0 tests, no errors).

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Shared Types

**Files:**
- Create: `lib/types.ts`
- Test: `lib/__tests__/types.test.ts`

**Step 1: Write the type definitions**

Create `lib/types.ts`:

```typescript
// --- Market Data Types ---

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  updatedAt: string; // ISO timestamp
}

export interface OHLCV {
  date: string; // ISO date
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y";

// --- Factor Engine Types ---

export type SignalDirection = "Bullish" | "Bearish" | "Neutral";

export interface FactorResult {
  name: string;
  score: number; // -1 to +1
  weight: number; // 0 to 1, all weights sum to 1
  reasoning: string;
}

export interface CompositeSignal {
  direction: SignalDirection;
  score: number; // -1 to +1
  confidence: number; // 0 to 100
  factors: FactorResult[];
  computedAt: string; // ISO timestamp
}

// --- AI Report Types ---

export interface DataSnapshot {
  goldPrice: number;
  silverPrice: number;
  vix: number;
  dxy: number;
  realRate: number;
}

export interface MarketReport {
  id: string;
  generatedAt: string; // ISO timestamp
  signal: CompositeSignal;
  summary: string;
  factorAnalysis: string;
  outlook: string;
  keyRisks: string[];
  dataSnapshot: DataSnapshot;
}

// --- FRED Data Types ---

export interface FredObservation {
  date: string;
  value: number;
}

export interface MacroData {
  fedFundsRate: number;
  cpi: number;
  treasury10Y: number;
  breakeven5Y: number;
  realRate: number; // fedFundsRate - breakeven5Y
}
```

**Step 2: Write a type guard test to validate the types are usable**

Create `lib/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type {
  Quote,
  FactorResult,
  CompositeSignal,
  MarketReport,
} from "../types";

describe("types", () => {
  it("Quote has required fields", () => {
    const quote: Quote = {
      symbol: "GC=F",
      price: 2650.5,
      change: 12.3,
      changePercent: 0.47,
      high: 2660.0,
      low: 2640.0,
      volume: 150000,
      updatedAt: new Date().toISOString(),
    };
    expect(quote.symbol).toBe("GC=F");
    expect(quote.price).toBeGreaterThan(0);
  });

  it("FactorResult score is bounded -1 to +1", () => {
    const factor: FactorResult = {
      name: "Real Interest Rate",
      score: -0.6,
      weight: 0.25,
      reasoning: "Negative real rate favors gold",
    };
    expect(factor.score).toBeGreaterThanOrEqual(-1);
    expect(factor.score).toBeLessThanOrEqual(1);
  });

  it("CompositeSignal aggregates factors", () => {
    const signal: CompositeSignal = {
      direction: "Bullish",
      score: 0.35,
      confidence: 72,
      factors: [],
      computedAt: new Date().toISOString(),
    };
    expect(signal.direction).toBe("Bullish");
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(100);
  });
});
```

**Step 3: Run tests**

```bash
npx vitest run lib/__tests__/types.test.ts
```

Expected: 3 tests PASS.

**Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add shared type definitions for market data, factors, and reports"
```

---

## Task 3: Yahoo Finance Data Client

**Files:**
- Create: `lib/data/yahoo.ts`
- Test: `lib/data/__tests__/yahoo.test.ts`

**Step 1: Write tests for the Yahoo Finance client**

Create `lib/data/__tests__/yahoo.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getQuotes, getHistory } from "../yahoo";

// Mock yahoo-finance2
vi.mock("yahoo-finance2", () => ({
  default: {
    quote: vi.fn(),
    historical: vi.fn(),
  },
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
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/data/__tests__/yahoo.test.ts
```

Expected: FAIL — module `../yahoo` does not exist.

**Step 3: Implement the Yahoo Finance client**

Create `lib/data/yahoo.ts`:

```typescript
import yahooFinance from "yahoo-finance2";
import { unstable_cache } from "next/cache";
import type { Quote, OHLCV, Timeframe } from "@/lib/types";

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
    SYMBOLS.map((symbol) => yahooFinance.quote(symbol))
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

  const results = await yahooFinance.historical(symbol, {
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
```

**Step 4: Run tests**

```bash
npx vitest run lib/data/__tests__/yahoo.test.ts
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add lib/data/
git commit -m "feat: add Yahoo Finance data client with caching"
```

---

## Task 4: FRED Data Client

**Files:**
- Create: `lib/data/fred.ts`
- Test: `lib/data/__tests__/fred.test.ts`

**Step 1: Write tests for the FRED client**

Create `lib/data/__tests__/fred.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMacroData } from "../fred";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockFredResponse(value: string) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        observations: [{ date: "2025-12-01", value }],
      }),
  };
}

describe("FRED client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRED_API_KEY = "test-key";
  });

  it("fetches and computes macro data including real rate", async () => {
    mockFetch
      .mockResolvedValueOnce(mockFredResponse("5.33"))  // fed funds
      .mockResolvedValueOnce(mockFredResponse("314.5"))  // CPI
      .mockResolvedValueOnce(mockFredResponse("4.25"))   // 10Y treasury
      .mockResolvedValueOnce(mockFredResponse("2.35"));  // 5Y breakeven

    const data = await getMacroData();

    expect(data.fedFundsRate).toBe(5.33);
    expect(data.cpi).toBe(314.5);
    expect(data.treasury10Y).toBe(4.25);
    expect(data.breakeven5Y).toBe(2.35);
    expect(data.realRate).toBeCloseTo(2.98); // 5.33 - 2.35
  });

  it("throws if FRED_API_KEY is missing", async () => {
    delete process.env.FRED_API_KEY;
    await expect(getMacroData()).rejects.toThrow("FRED_API_KEY");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/data/__tests__/fred.test.ts
```

Expected: FAIL — module `../fred` does not exist.

**Step 3: Implement the FRED client**

Create `lib/data/fred.ts`:

```typescript
import { unstable_cache } from "next/cache";
import type { MacroData } from "@/lib/types";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

const SERIES = {
  fedFundsRate: "FEDFUNDS",
  cpi: "CPIAUCSL",
  treasury10Y: "DGS10",
  breakeven5Y: "T5YIE",
} as const;

async function fetchLatestValue(seriesId: string): Promise<number> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error("FRED_API_KEY is not set");

  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`FRED API error for ${seriesId}: ${res.status}`);

  const data = await res.json();
  const value = data.observations?.[0]?.value;

  if (!value || value === ".") throw new Error(`No data for ${seriesId}`);

  return parseFloat(value);
}

async function fetchMacroData(): Promise<MacroData> {
  const [fedFundsRate, cpi, treasury10Y, breakeven5Y] = await Promise.all([
    fetchLatestValue(SERIES.fedFundsRate),
    fetchLatestValue(SERIES.cpi),
    fetchLatestValue(SERIES.treasury10Y),
    fetchLatestValue(SERIES.breakeven5Y),
  ]);

  return {
    fedFundsRate,
    cpi,
    treasury10Y,
    breakeven5Y,
    realRate: fedFundsRate - breakeven5Y,
  };
}

export const getMacroData = unstable_cache(
  fetchMacroData,
  ["fred-macro-data"],
  { revalidate: 86400 } // 24 hours
);
```

**Step 4: Run tests**

```bash
npx vitest run lib/data/__tests__/fred.test.ts
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add lib/data/fred.ts lib/data/__tests__/fred.test.ts
git commit -m "feat: add FRED macroeconomic data client"
```

---

## Task 5: Factor Engine — Types and Orchestrator Skeleton

**Files:**
- Create: `lib/factors/types.ts`, `lib/factors/index.ts`
- Test: `lib/factors/__tests__/composite.test.ts`

**Step 1: Write tests for the composite signal computation**

Create `lib/factors/__tests__/composite.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeComposite } from "../index";
import type { FactorResult } from "@/lib/types";

describe("computeComposite", () => {
  it("returns Bullish when weighted score > 0.15", () => {
    const factors: FactorResult[] = [
      { name: "A", score: 0.8, weight: 0.5, reasoning: "" },
      { name: "B", score: 0.6, weight: 0.3, reasoning: "" },
      { name: "C", score: 0.2, weight: 0.2, reasoning: "" },
    ];
    const result = computeComposite(factors);
    expect(result.direction).toBe("Bullish");
    expect(result.score).toBeCloseTo(0.62);
  });

  it("returns Bearish when weighted score < -0.15", () => {
    const factors: FactorResult[] = [
      { name: "A", score: -0.7, weight: 0.5, reasoning: "" },
      { name: "B", score: -0.4, weight: 0.3, reasoning: "" },
      { name: "C", score: -0.3, weight: 0.2, reasoning: "" },
    ];
    const result = computeComposite(factors);
    expect(result.direction).toBe("Bearish");
    expect(result.score).toBeLessThan(-0.15);
  });

  it("returns Neutral when score is between -0.15 and 0.15", () => {
    const factors: FactorResult[] = [
      { name: "A", score: 0.3, weight: 0.5, reasoning: "" },
      { name: "B", score: -0.3, weight: 0.5, reasoning: "" },
    ];
    const result = computeComposite(factors);
    expect(result.direction).toBe("Neutral");
  });

  it("high factor agreement yields high confidence", () => {
    const factors: FactorResult[] = [
      { name: "A", score: 0.7, weight: 0.33, reasoning: "" },
      { name: "B", score: 0.8, weight: 0.33, reasoning: "" },
      { name: "C", score: 0.6, weight: 0.34, reasoning: "" },
    ];
    const result = computeComposite(factors);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it("mixed factors yield low confidence", () => {
    const factors: FactorResult[] = [
      { name: "A", score: 0.9, weight: 0.33, reasoning: "" },
      { name: "B", score: -0.8, weight: 0.33, reasoning: "" },
      { name: "C", score: 0.1, weight: 0.34, reasoning: "" },
    ];
    const result = computeComposite(factors);
    expect(result.confidence).toBeLessThan(40);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/factors/__tests__/composite.test.ts
```

Expected: FAIL — module `../index` does not exist.

**Step 3: Implement the composite signal orchestrator**

Create `lib/factors/index.ts`:

```typescript
import type { FactorResult, CompositeSignal, SignalDirection } from "@/lib/types";

export function computeComposite(factors: FactorResult[]): CompositeSignal {
  // Weighted score
  const score = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

  // Direction
  let direction: SignalDirection = "Neutral";
  if (score > 0.15) direction = "Bullish";
  else if (score < -0.15) direction = "Bearish";

  // Confidence: inverse of score spread (standard deviation)
  const mean = factors.reduce((sum, f) => sum + f.score, 0) / factors.length;
  const variance =
    factors.reduce((sum, f) => sum + (f.score - mean) ** 2, 0) / factors.length;
  const stdDev = Math.sqrt(variance);
  // Map stdDev (0 = perfect agreement, ~1 = max disagreement) to 0-100
  // stdDev of 0 → 100% confidence, stdDev of 1 → 0%
  const confidence = Math.round(Math.max(0, Math.min(100, (1 - stdDev) * 100)));

  return {
    direction,
    score: Math.round(score * 1000) / 1000,
    confidence,
    factors,
    computedAt: new Date().toISOString(),
  };
}
```

**Step 4: Run tests**

```bash
npx vitest run lib/factors/__tests__/composite.test.ts
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add lib/factors/
git commit -m "feat: add composite signal computation with confidence scoring"
```

---

## Task 6: Factor Modules — Real Interest Rate, VIX, ETF Flows

**Files:**
- Create: `lib/factors/real-interest.ts`, `lib/factors/vix.ts`, `lib/factors/etf-flows.ts`
- Test: `lib/factors/__tests__/factors.test.ts`

**Step 1: Write tests for the three factor modules**

Create `lib/factors/__tests__/factors.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeRealInterest } from "../real-interest";
import { computeVix } from "../vix";
import { computeEtfFlows } from "../etf-flows";

describe("Real Interest Rate factor", () => {
  it("returns bullish score when real rate is negative", () => {
    const result = computeRealInterest({ realRate: -1.5 });
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.25);
    expect(result.name).toBe("Real Interest Rate");
  });

  it("returns bearish score when real rate is high positive", () => {
    const result = computeRealInterest({ realRate: 3.0 });
    expect(result.score).toBeLessThan(0);
  });

  it("clamps score to -1..+1", () => {
    const veryNeg = computeRealInterest({ realRate: -10 });
    expect(veryNeg.score).toBe(1);
    const veryPos = computeRealInterest({ realRate: 10 });
    expect(veryPos.score).toBe(-1);
  });
});

describe("VIX factor", () => {
  it("returns bullish when VIX is high (fear)", () => {
    const result = computeVix({ vix: 35 });
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.15);
  });

  it("returns bearish when VIX is low (complacency)", () => {
    const result = computeVix({ vix: 12 });
    expect(result.score).toBeLessThan(0);
  });
});

describe("ETF Flows factor", () => {
  it("returns bullish when volume and price are both rising", () => {
    const result = computeEtfFlows({
      currentPrice: 250,
      previousPrice: 245,
      currentVolume: 12000000,
      averageVolume: 8000000,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.15);
  });

  it("returns bearish when volume rising but price falling", () => {
    const result = computeEtfFlows({
      currentPrice: 240,
      previousPrice: 250,
      currentVolume: 12000000,
      averageVolume: 8000000,
    });
    expect(result.score).toBeLessThan(0);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/factors/__tests__/factors.test.ts
```

Expected: FAIL — modules do not exist.

**Step 3: Implement real-interest.ts**

Create `lib/factors/real-interest.ts`:

```typescript
import type { FactorResult } from "@/lib/types";

interface RealInterestInput {
  realRate: number; // fed funds rate - breakeven inflation
}

export function computeRealInterest(input: RealInterestInput): FactorResult {
  const { realRate } = input;

  // Negative real rates are bullish for gold (money loses value).
  // Score: inverse of real rate, scaled so +-3% maps to +-1.
  const raw = -realRate / 3;
  const score = Math.max(-1, Math.min(1, raw));

  const direction = score > 0 ? "negative, favoring gold" : "positive, headwind for gold";

  return {
    name: "Real Interest Rate",
    score,
    weight: 0.25,
    reasoning: `Real rate at ${realRate.toFixed(2)}% — ${direction}`,
  };
}
```

**Step 4: Implement vix.ts**

Create `lib/factors/vix.ts`:

```typescript
import type { FactorResult } from "@/lib/types";

interface VixInput {
  vix: number;
}

export function computeVix(input: VixInput): FactorResult {
  const { vix } = input;

  // VIX baseline ~20. High VIX = fear = gold safe haven buying = bullish.
  // Score: (vix - 20) / 20, clamped to -1..+1.
  const raw = (vix - 20) / 20;
  const score = Math.max(-1, Math.min(1, raw));

  const label =
    vix > 25 ? "elevated fear, safe-haven demand" :
    vix < 15 ? "low volatility, risk-on sentiment" :
    "moderate volatility";

  return {
    name: "VIX Volatility",
    score,
    weight: 0.15,
    reasoning: `VIX at ${vix.toFixed(1)} — ${label}`,
  };
}
```

**Step 5: Implement etf-flows.ts**

Create `lib/factors/etf-flows.ts`:

```typescript
import type { FactorResult } from "@/lib/types";

interface EtfFlowsInput {
  currentPrice: number;
  previousPrice: number;
  currentVolume: number;
  averageVolume: number;
}

export function computeEtfFlows(input: EtfFlowsInput): FactorResult {
  const { currentPrice, previousPrice, currentVolume, averageVolume } = input;

  const priceChange = (currentPrice - previousPrice) / previousPrice;
  const volumeRatio = currentVolume / averageVolume;

  // Rising price + above-average volume = bullish inflows
  // Falling price + above-average volume = bearish outflows
  // Low volume = weak signal either way
  const volumeMultiplier = Math.min(2, volumeRatio) / 2; // 0 to 1
  const raw = priceChange * 10 * volumeMultiplier; // scale price change
  const score = Math.max(-1, Math.min(1, raw));

  const flowDirection = score > 0 ? "net inflows" : "net outflows";

  return {
    name: "ETF Capital Flows",
    score,
    weight: 0.15,
    reasoning: `GLD showing ${flowDirection} (volume ${volumeRatio.toFixed(1)}x average)`,
  };
}
```

**Step 6: Run tests**

```bash
npx vitest run lib/factors/__tests__/factors.test.ts
```

Expected: All tests PASS.

**Step 7: Commit**

```bash
git add lib/factors/real-interest.ts lib/factors/vix.ts lib/factors/etf-flows.ts lib/factors/__tests__/factors.test.ts
git commit -m "feat: add real interest rate, VIX, and ETF flows factor modules"
```

---

## Task 7: Factor Modules — Technicals, USD Strength, Gold/Silver Ratio

**Files:**
- Create: `lib/factors/technicals.ts`, `lib/factors/usd-strength.ts`, `lib/factors/gold-silver-ratio.ts`
- Test: `lib/factors/__tests__/factors-2.test.ts`

**Step 1: Write tests**

Create `lib/factors/__tests__/factors-2.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeTechnicals } from "../technicals";
import { computeUsdStrength } from "../usd-strength";
import { computeGoldSilverRatio } from "../gold-silver-ratio";
import type { OHLCV } from "@/lib/types";

// Helper: generate price series
function makeSeries(prices: number[]): OHLCV[] {
  return prices.map((p, i) => ({
    date: `2025-01-${String(i + 1).padStart(2, "0")}`,
    open: p - 1,
    high: p + 5,
    low: p - 5,
    close: p,
    volume: 100000,
  }));
}

describe("Technical Indicators factor", () => {
  it("returns bullish when price is above moving averages and RSI is moderate", () => {
    // Uptrending prices: 50 data points rising from 2400 to 2700
    const prices = Array.from({ length: 50 }, (_, i) => 2400 + i * 6);
    const result = computeTechnicals(makeSeries(prices));
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.20);
  });

  it("returns bearish when price is below moving averages", () => {
    // Downtrending prices
    const prices = Array.from({ length: 50 }, (_, i) => 2700 - i * 6);
    const result = computeTechnicals(makeSeries(prices));
    expect(result.score).toBeLessThan(0);
  });
});

describe("USD Strength factor", () => {
  it("returns bearish for gold when USD is trending up", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 0.5);
    const result = computeUsdStrength(makeSeries(prices));
    expect(result.score).toBeLessThan(0); // strong dollar = bearish gold
    expect(result.weight).toBe(0.15);
  });

  it("returns bullish for gold when USD is trending down", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 110 - i * 0.5);
    const result = computeUsdStrength(makeSeries(prices));
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("Gold/Silver Ratio factor", () => {
  it("returns bullish when ratio is above historical average", () => {
    const result = computeGoldSilverRatio({
      currentRatio: 90,
      averageRatio: 80,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.10);
  });

  it("returns bearish when ratio is below historical average", () => {
    const result = computeGoldSilverRatio({
      currentRatio: 70,
      averageRatio: 80,
    });
    expect(result.score).toBeLessThan(0);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/factors/__tests__/factors-2.test.ts
```

Expected: FAIL — modules do not exist.

**Step 3: Implement technicals.ts**

Create `lib/factors/technicals.ts`:

```typescript
import type { FactorResult, OHLCV } from "@/lib/types";

function sma(data: number[], period: number): number {
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function rsi(closes: number[], period = 14): number {
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const recent = changes.slice(-period);
  const gains = recent.filter((c) => c > 0);
  const losses = recent.filter((c) => c < 0).map((c) => Math.abs(c));
  const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 0.001;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeTechnicals(history: OHLCV[]): FactorResult {
  const closes = history.map((h) => h.close);
  const currentPrice = closes[closes.length - 1];

  // Sub-indicators, each scored -1 to +1
  const scores: number[] = [];

  // 1. Price vs 50-period MA
  if (closes.length >= 50) {
    const ma50 = sma(closes, 50);
    scores.push(currentPrice > ma50 ? 0.5 : -0.5);
  }

  // 2. Price vs 200-period MA (use what we have if < 200)
  const maPeriod = Math.min(closes.length, 200);
  const maLong = sma(closes, maPeriod);
  scores.push(currentPrice > maLong ? 0.5 : -0.5);

  // 3. RSI: >60 slightly bullish, >70 overbought (less bullish), <40 bearish, <30 oversold
  if (closes.length >= 15) {
    const rsiValue = rsi(closes);
    if (rsiValue > 70) scores.push(0.2); // overbought, temper bullishness
    else if (rsiValue > 60) scores.push(0.5);
    else if (rsiValue > 40) scores.push(0);
    else if (rsiValue > 30) scores.push(-0.5);
    else scores.push(-0.2); // oversold, temper bearishness
  }

  const avgScore = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;
  const score = Math.max(-1, Math.min(1, avgScore));

  return {
    name: "Technical Indicators",
    score,
    weight: 0.20,
    reasoning: `Price ${currentPrice > maLong ? "above" : "below"} key moving averages, RSI ${closes.length >= 15 ? rsi(closes).toFixed(0) : "N/A"}`,
  };
}
```

**Step 4: Implement usd-strength.ts**

Create `lib/factors/usd-strength.ts`:

```typescript
import type { FactorResult, OHLCV } from "@/lib/types";

export function computeUsdStrength(dxyHistory: OHLCV[]): FactorResult {
  const closes = dxyHistory.map((h) => h.close);
  const current = closes[closes.length - 1];
  const past = closes[0];

  // Trend over the period: rising DXY = bearish for gold
  const change = (current - past) / past;
  // Invert: strong dollar → negative score for gold
  const raw = -change * 10;
  const score = Math.max(-1, Math.min(1, raw));

  const trend = change > 0 ? "strengthening" : "weakening";

  return {
    name: "USD Strength",
    score,
    weight: 0.15,
    reasoning: `Dollar ${trend} (${(change * 100).toFixed(2)}% over period)`,
  };
}
```

**Step 5: Implement gold-silver-ratio.ts**

Create `lib/factors/gold-silver-ratio.ts`:

```typescript
import type { FactorResult } from "@/lib/types";

interface GoldSilverRatioInput {
  currentRatio: number;
  averageRatio: number; // rolling 1-year average
}

export function computeGoldSilverRatio(
  input: GoldSilverRatioInput
): FactorResult {
  const { currentRatio, averageRatio } = input;

  // High ratio (gold expensive vs silver) historically precedes gold moves.
  // Above average → bullish signal.
  const deviation = (currentRatio - averageRatio) / averageRatio;
  const raw = deviation * 5;
  const score = Math.max(-1, Math.min(1, raw));

  return {
    name: "Gold/Silver Ratio",
    score,
    weight: 0.10,
    reasoning: `Ratio at ${currentRatio.toFixed(1)} (avg ${averageRatio.toFixed(1)}) — ${
      currentRatio > averageRatio ? "silver undervalued" : "ratio compressing"
    }`,
  };
}
```

**Step 6: Run tests**

```bash
npx vitest run lib/factors/__tests__/factors-2.test.ts
```

Expected: All tests PASS.

**Step 7: Commit**

```bash
git add lib/factors/technicals.ts lib/factors/usd-strength.ts lib/factors/gold-silver-ratio.ts lib/factors/__tests__/factors-2.test.ts
git commit -m "feat: add technicals, USD strength, and gold/silver ratio factors"
```

---

## Task 8: Factor Engine — Full Orchestrator

**Files:**
- Modify: `lib/factors/index.ts` — add `computeAllFactors()` that wires data sources to factor modules
- Test: `lib/factors/__tests__/orchestrator.test.ts`

**Step 1: Write integration test**

Create `lib/factors/__tests__/orchestrator.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { computeAllFactors } from "../index";

// Mock data clients
vi.mock("@/lib/data/yahoo", () => ({
  getQuotes: vi.fn().mockResolvedValue([
    { symbol: "GC=F", price: 2650, change: 10, changePercent: 0.38, high: 2660, low: 2640, volume: 150000, updatedAt: "" },
    { symbol: "SI=F", price: 31.5, change: 0.3, changePercent: 0.96, high: 31.8, low: 31.2, volume: 80000, updatedAt: "" },
    { symbol: "DX-Y.NYB", price: 104, change: -0.2, changePercent: -0.19, high: 104.5, low: 103.8, volume: 50000, updatedAt: "" },
    { symbol: "^VIX", price: 22, change: 1.5, changePercent: 7.3, high: 23, low: 20, volume: 0, updatedAt: "" },
    { symbol: "GLD", price: 245, change: 2, changePercent: 0.82, high: 246, low: 243, volume: 10000000, updatedAt: "" },
  ]),
  getHistory: vi.fn().mockResolvedValue(
    Array.from({ length: 50 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      open: 2400 + i * 5,
      high: 2410 + i * 5,
      low: 2395 + i * 5,
      close: 2400 + i * 5,
      volume: 100000,
    }))
  ),
}));

vi.mock("@/lib/data/fred", () => ({
  getMacroData: vi.fn().mockResolvedValue({
    fedFundsRate: 5.33,
    cpi: 314.5,
    treasury10Y: 4.25,
    breakeven5Y: 2.35,
    realRate: 2.98,
  }),
}));

describe("computeAllFactors (orchestrator)", () => {
  it("returns a CompositeSignal with all 6 factors", async () => {
    const signal = await computeAllFactors();

    expect(signal.factors).toHaveLength(6);
    expect(signal.direction).toMatch(/^(Bullish|Bearish|Neutral)$/);
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(100);

    const names = signal.factors.map((f) => f.name);
    expect(names).toContain("Real Interest Rate");
    expect(names).toContain("VIX Volatility");
    expect(names).toContain("ETF Capital Flows");
    expect(names).toContain("Technical Indicators");
    expect(names).toContain("USD Strength");
    expect(names).toContain("Gold/Silver Ratio");

    // Weights sum to 1
    const totalWeight = signal.factors.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/factors/__tests__/orchestrator.test.ts
```

Expected: FAIL — `computeAllFactors` is not exported.

**Step 3: Implement the full orchestrator**

Update `lib/factors/index.ts` — add `computeAllFactors` below the existing `computeComposite`:

```typescript
import type { FactorResult, CompositeSignal, SignalDirection } from "@/lib/types";
import { getQuotes, getHistory } from "@/lib/data/yahoo";
import { getMacroData } from "@/lib/data/fred";
import { computeRealInterest } from "./real-interest";
import { computeVix } from "./vix";
import { computeEtfFlows } from "./etf-flows";
import { computeTechnicals } from "./technicals";
import { computeUsdStrength } from "./usd-strength";
import { computeGoldSilverRatio } from "./gold-silver-ratio";

export function computeComposite(factors: FactorResult[]): CompositeSignal {
  const score = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

  let direction: SignalDirection = "Neutral";
  if (score > 0.15) direction = "Bullish";
  else if (score < -0.15) direction = "Bearish";

  const mean = factors.reduce((sum, f) => sum + f.score, 0) / factors.length;
  const variance =
    factors.reduce((sum, f) => sum + (f.score - mean) ** 2, 0) / factors.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.round(Math.max(0, Math.min(100, (1 - stdDev) * 100)));

  return {
    direction,
    score: Math.round(score * 1000) / 1000,
    confidence,
    factors,
    computedAt: new Date().toISOString(),
  };
}

export async function computeAllFactors(): Promise<CompositeSignal> {
  const [quotes, macro, goldHistory, dxyHistory] = await Promise.all([
    getQuotes(),
    getMacroData(),
    getHistory("GC=F", "3M"),
    getHistory("DX-Y.NYB", "1M"),
  ]);

  const gold = quotes.find((q) => q.symbol === "GC=F")!;
  const silver = quotes.find((q) => q.symbol === "SI=F")!;
  const vix = quotes.find((q) => q.symbol === "^VIX")!;
  const gld = quotes.find((q) => q.symbol === "GLD")!;

  // Compute gold/silver ratio average from history
  const silverHistory = await getHistory("SI=F", "1Y");
  const goldHistoryYear = await getHistory("GC=F", "1Y");
  const ratios = goldHistoryYear.map((g, i) => {
    const s = silverHistory[i];
    return s ? g.close / s.close : gold.price / silver.price;
  });
  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

  // GLD previous price (yesterday from history)
  const gldHistory = await getHistory("GLD", "1W");
  const gldPrevious = gldHistory.length > 1
    ? gldHistory[gldHistory.length - 2].close
    : gld.price;

  const factors: FactorResult[] = [
    computeRealInterest({ realRate: macro.realRate }),
    computeVix({ vix: vix.price }),
    computeEtfFlows({
      currentPrice: gld.price,
      previousPrice: gldPrevious,
      currentVolume: gld.volume,
      averageVolume: gld.volume, // simplified — would ideally use 20-day avg
    }),
    computeTechnicals(goldHistory),
    computeUsdStrength(dxyHistory),
    computeGoldSilverRatio({
      currentRatio: gold.price / silver.price,
      averageRatio: avgRatio,
    }),
  ];

  return computeComposite(factors);
}
```

**Step 4: Run tests**

```bash
npx vitest run lib/factors/__tests__/orchestrator.test.ts
```

Expected: PASS.

**Step 5: Run all factor tests**

```bash
npx vitest run lib/factors/
```

Expected: All tests PASS.

**Step 6: Commit**

```bash
git add lib/factors/
git commit -m "feat: wire factor engine orchestrator to data sources"
```

---

## Task 9: API Routes — Market Data and Factors

**Files:**
- Create: `app/api/market/quotes/route.ts`, `app/api/market/history/route.ts`, `app/api/factors/route.ts`

**Step 1: Create quotes API route**

Create `app/api/market/quotes/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/data/yahoo";

export async function GET() {
  try {
    const quotes = await getQuotes();
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("Failed to fetch quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch market quotes" },
      { status: 500 }
    );
  }
}
```

**Step 2: Create history API route**

Create `app/api/market/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@/lib/data/yahoo";
import type { Timeframe } from "@/lib/types";

const VALID_SYMBOLS = ["GC=F", "SI=F", "DX-Y.NYB", "^VIX", "GLD"];
const VALID_TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "1Y", "5Y"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get("symbol") ?? "GC=F";
  const timeframe = (searchParams.get("timeframe") ?? "1M") as Timeframe;

  if (!VALID_SYMBOLS.includes(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }
  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  }

  try {
    const history = await getHistory(symbol, timeframe);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
```

**Step 3: Create factors API route**

Create `app/api/factors/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { computeAllFactors } from "@/lib/factors";

export async function GET() {
  try {
    const signal = await computeAllFactors();
    return NextResponse.json(signal);
  } catch (error) {
    console.error("Failed to compute factors:", error);
    return NextResponse.json(
      { error: "Failed to compute market factors" },
      { status: 500 }
    );
  }
}
```

**Step 4: Verify routes compile**

```bash
npx next build 2>&1 | head -30
```

Expected: Build succeeds (or at least the API routes compile without type errors).

**Step 5: Commit**

```bash
git add app/api/
git commit -m "feat: add API routes for quotes, history, and factors"
```

---

## Task 10: AI Report Generator

**Files:**
- Create: `lib/reports/generate.ts`, `lib/reports/storage.ts`
- Create: `app/api/cron/generate-report/route.ts`, `app/api/reports/latest/route.ts`
- Test: `lib/reports/__tests__/generate.test.ts`

**Step 1: Write tests for report generation**

Create `lib/reports/__tests__/generate.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { buildReportPrompt } from "../generate";
import type { CompositeSignal, DataSnapshot } from "@/lib/types";

describe("buildReportPrompt", () => {
  it("includes all data in the prompt", () => {
    const signal: CompositeSignal = {
      direction: "Bullish",
      score: 0.35,
      confidence: 72,
      factors: [
        { name: "Real Interest Rate", score: 0.6, weight: 0.25, reasoning: "Negative real rate" },
        { name: "VIX", score: 0.3, weight: 0.15, reasoning: "Elevated" },
      ],
      computedAt: new Date().toISOString(),
    };
    const snapshot: DataSnapshot = {
      goldPrice: 2650,
      silverPrice: 31.5,
      vix: 22,
      dxy: 104,
      realRate: -1.2,
    };

    const prompt = buildReportPrompt(signal, snapshot);

    expect(prompt).toContain("2650");
    expect(prompt).toContain("Bullish");
    expect(prompt).toContain("72");
    expect(prompt).toContain("Real Interest Rate");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run lib/reports/__tests__/generate.test.ts
```

Expected: FAIL.

**Step 3: Implement report generation**

Create `lib/reports/generate.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { CompositeSignal, DataSnapshot, MarketReport } from "@/lib/types";

const SYSTEM_PROMPT = `You are a precious metals market analyst. Analyze the provided market data and factor signals.
Be concise and data-driven. Never speculate beyond what the data shows.
Respond in JSON format with these fields:
- summary: 2-3 sentence executive summary
- factorAnalysis: paragraph analyzing each factor's contribution
- outlook: 1-2 week outlook based on the data
- keyRisks: array of 2-3 risk factors as short strings`;

export function buildReportPrompt(
  signal: CompositeSignal,
  snapshot: DataSnapshot
): string {
  const factorLines = signal.factors
    .map(
      (f) =>
        `- ${f.name}: score ${f.score.toFixed(2)} (weight ${(f.weight * 100).toFixed(0)}%) — ${f.reasoning}`
    )
    .join("\n");

  return `Market Data Snapshot:
- Gold: $${snapshot.goldPrice.toFixed(2)}
- Silver: $${snapshot.silverPrice.toFixed(2)}
- VIX: ${snapshot.vix.toFixed(1)}
- US Dollar Index: ${snapshot.dxy.toFixed(2)}
- Real Interest Rate: ${snapshot.realRate.toFixed(2)}%

Composite Signal: ${signal.direction} (score: ${signal.score.toFixed(3)}, confidence: ${signal.confidence}%)

Factor Breakdown:
${factorLines}

Generate your analysis.`;
}

export async function generateReport(
  signal: CompositeSignal,
  snapshot: DataSnapshot
): Promise<MarketReport> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildReportPrompt(signal, snapshot) },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text);

  return {
    id: `report-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    signal,
    summary: parsed.summary,
    factorAnalysis: parsed.factorAnalysis,
    outlook: parsed.outlook,
    keyRisks: parsed.keyRisks,
    dataSnapshot: snapshot,
  };
}
```

**Step 4: Implement report storage**

Create `lib/reports/storage.ts`:

```typescript
import { put, list, head } from "@vercel/blob";
import type { MarketReport } from "@/lib/types";

const BLOB_PREFIX = "reports/";

export async function saveReport(report: MarketReport): Promise<string> {
  const key = `${BLOB_PREFIX}${report.generatedAt.split("T")[0]}.json`;
  const blob = await put(key, JSON.stringify(report), {
    access: "public",
    contentType: "application/json",
  });
  return blob.url;
}

export async function getLatestReport(): Promise<MarketReport | null> {
  const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 1 });
  if (blobs.length === 0) return null;

  const res = await fetch(blobs[0].url);
  return res.json();
}

export async function getReportByDate(
  date: string
): Promise<MarketReport | null> {
  try {
    const key = `${BLOB_PREFIX}${date}.json`;
    const blob = await head(key);
    if (!blob) return null;
    const res = await fetch(blob.url);
    return res.json();
  } catch {
    return null;
  }
}
```

**Step 5: Create cron route**

Create `app/api/cron/generate-report/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { computeAllFactors } from "@/lib/factors";
import { getQuotes } from "@/lib/data/yahoo";
import { getMacroData } from "@/lib/data/fred";
import { generateReport } from "@/lib/reports/generate";
import { saveReport } from "@/lib/reports/storage";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [signal, quotes, macro] = await Promise.all([
      computeAllFactors(),
      getQuotes(),
      getMacroData(),
    ]);

    const gold = quotes.find((q) => q.symbol === "GC=F")!;
    const silver = quotes.find((q) => q.symbol === "SI=F")!;
    const vix = quotes.find((q) => q.symbol === "^VIX")!;
    const dxy = quotes.find((q) => q.symbol === "DX-Y.NYB")!;

    const snapshot = {
      goldPrice: gold.price,
      silverPrice: silver.price,
      vix: vix.price,
      dxy: dxy.price,
      realRate: macro.realRate,
    };

    const report = await generateReport(signal, snapshot);
    const url = await saveReport(report);

    return NextResponse.json({ success: true, reportUrl: url });
  } catch (error) {
    console.error("Report generation failed:", error);
    return NextResponse.json(
      { error: "Report generation failed" },
      { status: 500 }
    );
  }
}
```

**Step 6: Create reports API route**

Create `app/api/reports/latest/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getLatestReport } from "@/lib/reports/storage";

export async function GET() {
  try {
    const report = await getLatestReport();
    if (!report) {
      return NextResponse.json({ error: "No reports yet" }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to fetch report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
```

**Step 7: Add Vercel cron config**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-report",
      "schedule": "0 22 * * 1-5"
    }
  ]
}
```

Note: `0 22 * * 1-5` = 10 PM UTC = 5 PM ET, weekdays only.

**Step 8: Run tests**

```bash
npx vitest run lib/reports/
```

Expected: PASS.

**Step 9: Commit**

```bash
git add lib/reports/ app/api/cron/ app/api/reports/ vercel.json
git commit -m "feat: add AI report generator with Claude API and Vercel cron"
```

---

## Task 11: Theme Provider and Layout

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/layout/ThemeProvider.tsx`, `components/layout/Header.tsx`

**Step 1: Create ThemeProvider**

Create `components/layout/ThemeProvider.tsx`:

```typescript
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

**Step 2: Create Header**

Create `components/layout/Header.tsx`:

```typescript
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-primary">Gold Market Analytics</h1>
      </div>
      <div className="flex items-center gap-4">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="px-3 py-1.5 rounded-md border border-border text-sm text-secondary hover:bg-hover transition-colors"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        )}
      </div>
    </header>
  );
}
```

**Step 3: Update app/layout.tsx**

Replace `app/layout.tsx` contents:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Header } from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gold Market Analytics",
  description: "Precious metals analytics with AI-powered trend signals",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <ThemeProvider>
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Step 4: Update globals.css with theme variables**

Replace `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root,
  [data-theme="light"] {
    --background: #ffffff;
    --surface: #f8f9fa;
    --border: #e2e8f0;
    --foreground: #1a202c;
    --primary: #d4a017;
    --secondary: #64748b;
    --hover: #f1f5f9;
    --bullish: #16a34a;
    --bearish: #dc2626;
    --neutral: #6b7280;
    --card: #ffffff;
    --card-border: #e2e8f0;
  }

  [data-theme="dark"] {
    --background: #0f1117;
    --surface: #1a1d27;
    --border: #2d3141;
    --foreground: #e2e8f0;
    --primary: #f5c842;
    --secondary: #94a3b8;
    --hover: #252836;
    --bullish: #22c55e;
    --bearish: #ef4444;
    --neutral: #9ca3af;
    --card: #1e2130;
    --card-border: #2d3141;
  }
}

body {
  background-color: var(--background);
  color: var(--foreground);
}
```

**Step 5: Update tailwind.config.ts to use CSS variables**

In `tailwind.config.ts`, extend the theme colors:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        border: "var(--border)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        hover: "var(--hover)",
        bullish: "var(--bullish)",
        bearish: "var(--bearish)",
        neutral: "var(--neutral)",
        card: "var(--card)",
        "card-border": "var(--card-border)",
      },
    },
  },
  plugins: [],
};
export default config;
```

**Step 6: Verify dev server runs**

```bash
npm run dev
```

Expected: Page loads with header and theme toggle.

**Step 7: Commit**

```bash
git add components/ app/layout.tsx app/globals.css tailwind.config.ts
git commit -m "feat: add theme provider, header, and dark/light CSS variables"
```

---

## Task 12: Dashboard Components — Price Cards

**Files:**
- Create: `components/dashboard/PriceCard.tsx`
- Create: `lib/hooks/useMarketData.ts` — SWR hook for client-side data fetching

**Step 1: Create SWR hook**

Create `lib/hooks/useMarketData.ts`:

```typescript
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
```

**Step 2: Create PriceCard component**

Create `components/dashboard/PriceCard.tsx`:

```typescript
"use client";

import type { Quote } from "@/lib/types";

interface PriceCardProps {
  quote: Quote;
  label: string;
}

export function PriceCard({ quote, label }: PriceCardProps) {
  const isPositive = quote.change >= 0;

  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <div className="text-sm text-secondary mb-1">{label}</div>
      <div className="text-2xl font-bold text-foreground">
        ${quote.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
      <div
        className={`text-sm font-medium mt-1 ${
          isPositive ? "text-bullish" : "text-bearish"
        }`}
      >
        {isPositive ? "+" : ""}
        {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
        {quote.changePercent.toFixed(2)}%)
      </div>
      <div className="text-xs text-secondary mt-2">
        H: ${quote.high.toFixed(2)} L: ${quote.low.toFixed(2)}
      </div>
    </div>
  );
}
```

**Step 3: Verify it compiles**

```bash
npx next build 2>&1 | tail -5
```

Expected: No type errors for PriceCard.

**Step 4: Commit**

```bash
git add components/dashboard/PriceCard.tsx lib/hooks/
git commit -m "feat: add PriceCard component and SWR data hooks"
```

---

## Task 13: Dashboard Components — Trend Signal and Factor Breakdown

**Files:**
- Create: `components/dashboard/TrendSignal.tsx`, `components/dashboard/FactorBreakdown.tsx`, `components/dashboard/FactorCard.tsx`

**Step 1: Create TrendSignal component**

Create `components/dashboard/TrendSignal.tsx`:

```typescript
"use client";

import type { CompositeSignal } from "@/lib/types";

interface TrendSignalProps {
  signal: CompositeSignal;
}

export function TrendSignal({ signal }: TrendSignalProps) {
  const colorClass =
    signal.direction === "Bullish"
      ? "text-bullish border-bullish"
      : signal.direction === "Bearish"
        ? "text-bearish border-bearish"
        : "text-neutral border-neutral";

  const bgClass =
    signal.direction === "Bullish"
      ? "bg-bullish/10"
      : signal.direction === "Bearish"
        ? "bg-bearish/10"
        : "bg-neutral/10";

  return (
    <div className="bg-card border border-card-border rounded-lg p-6 text-center">
      <div className="text-sm text-secondary mb-2">Trend Signal</div>
      <div
        className={`inline-block px-6 py-3 rounded-full border-2 text-2xl font-bold ${colorClass} ${bgClass}`}
      >
        {signal.direction}
      </div>
      <div className="mt-4 flex justify-center gap-8">
        <div>
          <div className="text-xs text-secondary">Score</div>
          <div className="text-lg font-semibold text-foreground">
            {signal.score > 0 ? "+" : ""}
            {signal.score.toFixed(3)}
          </div>
        </div>
        <div>
          <div className="text-xs text-secondary">Confidence</div>
          <div className="text-lg font-semibold text-foreground">
            {signal.confidence}%
          </div>
        </div>
      </div>
      {/* Confidence bar */}
      <div className="mt-3 mx-auto max-w-xs h-2 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            signal.direction === "Bullish"
              ? "bg-bullish"
              : signal.direction === "Bearish"
                ? "bg-bearish"
                : "bg-neutral"
          }`}
          style={{ width: `${signal.confidence}%` }}
        />
      </div>
    </div>
  );
}
```

**Step 2: Create FactorCard component**

Create `components/dashboard/FactorCard.tsx`:

```typescript
"use client";

import type { FactorResult } from "@/lib/types";

interface FactorCardProps {
  factor: FactorResult;
}

export function FactorCard({ factor }: FactorCardProps) {
  // Map score -1..+1 to bar position 0..100
  const barPosition = ((factor.score + 1) / 2) * 100;
  const isPositive = factor.score >= 0;

  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">
          {factor.name}
        </span>
        <span className="text-xs text-secondary">
          {(factor.weight * 100).toFixed(0)}% weight
        </span>
      </div>
      {/* Score bar */}
      <div className="relative h-2 bg-border rounded-full mb-2">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-secondary/50" />
        {/* Score indicator */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${
            isPositive ? "bg-bullish" : "bg-bearish"
          }`}
          style={{ left: `calc(${barPosition}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-secondary">{factor.reasoning}</span>
        <span
          className={`text-xs font-mono font-bold ${
            isPositive ? "text-bullish" : "text-bearish"
          }`}
        >
          {factor.score > 0 ? "+" : ""}
          {factor.score.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
```

**Step 3: Create FactorBreakdown component**

Create `components/dashboard/FactorBreakdown.tsx`:

```typescript
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
```

**Step 4: Commit**

```bash
git add components/dashboard/TrendSignal.tsx components/dashboard/FactorCard.tsx components/dashboard/FactorBreakdown.tsx
git commit -m "feat: add TrendSignal and FactorBreakdown dashboard components"
```

---

## Task 14: Dashboard Components — Price Chart

**Files:**
- Create: `components/dashboard/PriceChart.tsx`

**Step 1: Create the chart component**

Create `components/dashboard/PriceChart.tsx`:

```typescript
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
```

**Step 2: Commit**

```bash
git add components/dashboard/PriceChart.tsx
git commit -m "feat: add interactive candlestick price chart with TradingView lightweight-charts"
```

---

## Task 15: Dashboard Components — Report Card

**Files:**
- Create: `components/dashboard/ReportCard.tsx`

**Step 1: Create ReportCard component**

Create `components/dashboard/ReportCard.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { MarketReport } from "@/lib/types";

interface ReportCardProps {
  report: MarketReport | null;
}

export function ReportCard({ report }: ReportCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!report) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-6 text-center text-secondary">
        No AI report available yet. Reports are generated daily at market close.
      </div>
    );
  }

  const date = new Date(report.generatedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-card border border-card-border rounded-lg p-6">
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-lg font-semibold text-foreground">
          AI Market Report
        </h2>
        <span className="text-xs text-secondary">{date}</span>
      </div>

      <p className="text-foreground mb-4">{report.summary}</p>

      {/* Key risks */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-secondary mb-2">Key Risks</h3>
        <ul className="list-disc list-inside text-sm text-foreground space-y-1">
          {report.keyRisks.map((risk, i) => (
            <li key={i}>{risk}</li>
          ))}
        </ul>
      </div>

      {/* Expandable full analysis */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-primary hover:underline"
      >
        {expanded ? "Show less" : "Read full analysis"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 text-sm text-foreground">
          <div>
            <h3 className="font-medium text-secondary mb-1">Factor Analysis</h3>
            <p>{report.factorAnalysis}</p>
          </div>
          <div>
            <h3 className="font-medium text-secondary mb-1">Outlook</h3>
            <p>{report.outlook}</p>
          </div>
          <div>
            <h3 className="font-medium text-secondary mb-1">
              Data at time of report
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div>
                Gold: ${report.dataSnapshot.goldPrice.toFixed(2)}
              </div>
              <div>
                Silver: ${report.dataSnapshot.silverPrice.toFixed(2)}
              </div>
              <div>VIX: {report.dataSnapshot.vix.toFixed(1)}</div>
              <div>DXY: {report.dataSnapshot.dxy.toFixed(2)}</div>
              <div>
                Real Rate: {report.dataSnapshot.realRate.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/dashboard/ReportCard.tsx
git commit -m "feat: add expandable AI report card component"
```

---

## Task 16: Assemble Dashboard Page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Wire all components into the main page**

Replace `app/page.tsx`:

```typescript
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
  const goldQuote = quotes.find((q) => q.symbol === "GC=F");
  const silverQuote = quotes.find((q) => q.symbol === "SI=F");

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
```

**Step 2: Verify the full app compiles**

```bash
npx next build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: assemble dashboard page with all components"
```

---

## Task 17: Run All Tests and Final Verification

**Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 2: Run the dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
- Header shows with theme toggle
- Theme toggle works (dark/light)
- Page renders loading state (API calls will fail without real env vars — this is expected)

**Step 3: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes with no errors.

**Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```

---

## Summary

| Task | Description | Key files |
|------|-------------|-----------|
| 1 | Project scaffolding | `package.json`, `vitest.config.ts` |
| 2 | Shared types | `lib/types.ts` |
| 3 | Yahoo Finance client | `lib/data/yahoo.ts` |
| 4 | FRED client | `lib/data/fred.ts` |
| 5 | Composite signal computation | `lib/factors/index.ts` |
| 6 | Factors: real interest, VIX, ETF flows | `lib/factors/real-interest.ts`, `vix.ts`, `etf-flows.ts` |
| 7 | Factors: technicals, USD, gold/silver | `lib/factors/technicals.ts`, `usd-strength.ts`, `gold-silver-ratio.ts` |
| 8 | Factor orchestrator | `lib/factors/index.ts` |
| 9 | API routes | `app/api/market/`, `app/api/factors/` |
| 10 | AI report generator + cron | `lib/reports/`, `app/api/cron/`, `vercel.json` |
| 11 | Theme + layout | `components/layout/`, `globals.css` |
| 12 | Price cards + SWR hooks | `components/dashboard/PriceCard.tsx`, `lib/hooks/` |
| 13 | Trend signal + factor breakdown | `TrendSignal.tsx`, `FactorBreakdown.tsx`, `FactorCard.tsx` |
| 14 | Price chart | `PriceChart.tsx` |
| 15 | Report card | `ReportCard.tsx` |
| 16 | Assemble dashboard | `app/page.tsx` |
| 17 | Full test + verification | All files |
