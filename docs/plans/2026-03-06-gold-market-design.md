# Gold Market Analytics — Design Document

**Date:** 2026-03-06
**Status:** Approved
**Stack:** Next.js + TypeScript, deployed on Vercel

## Overview

A precious metals analytics dashboard with real-time gold/silver pricing, a weighted multi-factor trend signal, and automated AI-generated market reports. Inspired by [gold.vdj.me](https://gold.vdj.me/en).

## Architecture

Monolithic Next.js app — pages, API routes, factor computation, and AI report generation all in one codebase.

```
Next.js App
├── /app (pages + UI)
├── /app/api (data fetching, factor engine, AI reports)
├── /lib/factors (factor computation modules)
├── /lib/data (Yahoo Finance + FRED clients)
└── Vercel Cron → triggers AI report generation
```

## Data Layer

### Sources

- **Yahoo Finance** (`yahoo-finance2`): Gold (GC=F), Silver (SI=F), USD Index (DX-Y.NYB), GLD ETF, VIX (^VIX)
- **FRED API**: Fed Funds Rate (FEDFUNDS), CPI (CPIAUCSL), 10Y Treasury (DGS10), 5Y Breakeven Inflation (T5YIE)

### Caching

| Data type | TTL |
|-----------|-----|
| Price quotes | 5 min |
| Historical OHLCV | 1 hour |
| FRED macro data | 24 hours |
| Computed factor signals | 15 min |

### API Routes

```
/api/market/quotes      → current prices
/api/market/history     → historical OHLCV
/api/factors            → factor breakdown + composite signal
/api/reports/latest     → most recent AI report
/api/reports/[date]     → specific report
/api/cron/generate-report → cron endpoint (CRON_SECRET secured)
```

## Factor Engine

Six factors, each scoring -1 (bearish) to +1 (bullish):

| Factor | Weight | Source | Logic |
|--------|--------|--------|-------|
| Real Interest Rate | 25% | FRED | Negative real rates bullish for gold |
| VIX Volatility | 15% | Yahoo | High VIX bullish (safe-haven) |
| ETF Capital Flows | 15% | Yahoo (GLD) | Rising volume + price = bullish inflows |
| Technical Indicators | 20% | Computed | 50/200 MA, RSI, MACD composite |
| USD Strength | 15% | Yahoo (DXY) | Strong dollar bearish for gold |
| Gold/Silver Ratio | 10% | Computed | High ratio = silver undervalued |

### Composite Signal

```
compositeScore = sum(factor_score * factor_weight)

confidence = inverse of factor score standard deviation (0-100%)
             high agreement → high confidence

signal:
  > 0.15  → Bullish
  < -0.15 → Bearish
  else    → Neutral
```

### Module Structure

```
/lib/factors/
  index.ts              → orchestrator
  types.ts              → FactorResult, CompositeSignal, SignalDirection
  real-interest.ts      → real interest rate
  vix.ts                → VIX volatility
  etf-flows.ts          → ETF capital flows
  technicals.ts         → MA, RSI, MACD
  usd-strength.ts       → USD strength
  gold-silver-ratio.ts  → gold/silver ratio
```

Each module exports: `computeScore(data) → { score, weight, reasoning }`

## AI Report Generator

### Flow

Vercel Cron (daily, 5 PM ET weekdays) → fetch factor signals + price data → Claude API prompt → store report to Vercel Blob.

### Report Schema

```typescript
interface MarketReport {
  id: string
  generatedAt: Date
  signal: CompositeSignal
  summary: string              // 2-3 sentence executive summary
  factorAnalysis: string       // AI interpretation of each factor
  outlook: string              // 1-2 week outlook
  keyRisks: string[]           // 2-3 risk bullet points
  dataSnapshot: {
    goldPrice: number
    silverPrice: number
    vix: number
    dxy: number
    realRate: number
  }
}
```

### Prompt Strategy

Data-grounded: all numbers and factor scores passed in the prompt. System prompt constrains the AI to be concise, data-driven, and never speculate beyond the data.

### Storage

Vercel Blob (v1) — JSON files keyed by date. Migrate to Turso/SQLite if search/filtering needed later.

## UI

### Pages

- **`/`** — Dashboard: price cards, trend signal hero, factor breakdown, price chart, technical overlays, latest AI report
- **`/reports`** — Report history list

### Components

```
/components/
  layout/Header.tsx, ThemeProvider.tsx
  dashboard/
    PriceCard.tsx, TrendSignal.tsx, FactorBreakdown.tsx,
    FactorCard.tsx, PriceChart.tsx, TechnicalOverlay.tsx,
    ReportCard.tsx
```

### Charting

`lightweight-charts` (TradingView) — candlesticks, volume, MA/RSI/MACD overlays.

### Theming

CSS variables + `next-themes`. Dark and light themes with toggle. System preference detection.

### Data Fetching

- Server Components for SSR initial load
- SWR client-side revalidation: quotes every 60s, factors every 5-15 min

## Key Dependencies

- `next` — framework
- `yahoo-finance2` — market data
- `lightweight-charts` — charting
- `next-themes` — theme toggle
- `swr` — client-side data fetching
- `@anthropic-ai/sdk` — Claude API for reports
- `@vercel/blob` — report storage
