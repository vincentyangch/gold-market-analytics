<div align="center">

# Gold Market Analytics

**Real-time precious metals market analysis dashboard powered by AI**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

Gold Market Analytics combines real-time market data, a multi-factor signal engine, and AI-powered reports to help you understand precious metals markets at a glance.

## Features

- **Real-time prices** — Gold, silver, VIX, USD Index via Yahoo Finance
- **Composite signal engine** — Bullish / Bearish / Neutral with confidence score from 6 weighted factors
- **AI market reports** — Daily analysis with outlook and risk assessment
- **Multi-provider AI** — Swap between OpenAI, Anthropic Claude, and Google Gemini via env vars
- **Interactive charts** — Candlestick charts with 6 timeframes (1D → 5Y)
- **Dark / Light theme** — Automatic system detection with manual toggle
- **Auto-refresh** — Dashboard updates every 60s with last-updated indicator

https://gold.ai-webapp.com/

<img width="1256" height="750" alt="Screenshot 2026-03-09 at 11 51 56 PM" src="https://github.com/user-attachments/assets/4464ca58-4265-466b-88f0-0a224bccf45a" />
<img width="1242" height="641" alt="Screenshot 2026-03-09 at 11 52 08 PM" src="https://github.com/user-attachments/assets/8b46f89c-760e-4225-9d68-cea3e691fe40" />

## Quick Start

### Prerequisites

- Node.js 18+
- A [FRED API key](https://fred.stlouisfed.org/docs/api/api_key.html) (free)
- An AI provider API key (OpenAI, Anthropic, or Google Gemini)

### Installation

```bash
git clone https://github.com/vincentyangch/gold-market-analytics.git
cd gold-market-analytics
npm install
```

### Configuration

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

```env
FRED_API_KEY=your_fred_api_key
AI_PROVIDER=openai              # openai | anthropic | gemini
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.openai.com   # optional, for proxies
AI_MODEL=gpt-4o                 # provider-specific model name
CRON_SECRET=your_secret
```

**Default models by provider:**

| Provider | Default Model | SDK |
|----------|--------------|-----|
| `openai` | `gpt-4o` | Raw fetch (Chat Completions API) |
| `anthropic` | `claude-sonnet-4-6` | @anthropic-ai/sdk |
| `gemini` | `gemini-2.0-flash` | Raw fetch (Gemini REST API) |

### Run

```bash
npm run dev          # Development server at http://localhost:3000
npm run build        # Production build
npm start            # Start production server
npm run lint         # Lint with ESLint
npx vitest           # Run tests
```

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5, React 19 |
| Styling | Tailwind CSS 3, next-themes |
| Charts | lightweight-charts (TradingView) |
| Data Fetching | SWR (client), fetch + unstable_cache (server) |
| Market Data | yahoo-finance2 |
| Macro Data | FRED API |
| AI | OpenAI / Anthropic / Gemini (pluggable) |
| Testing | Vitest, Testing Library |

### Project Structure

```
app/
├── api/
│   ├── factors/route.ts              # Composite signal endpoint
│   ├── market/quotes/route.ts        # Current prices
│   ├── market/history/route.ts       # OHLCV history
│   ├── reports/latest/route.ts       # Latest AI report
│   └── cron/generate-report/route.ts # Report generation trigger
├── layout.tsx                        # Root layout + theme provider
└── page.tsx                          # Dashboard page

components/
├── dashboard/
│   ├── PriceCard.tsx                 # Price display card
│   ├── PriceChart.tsx                # Candlestick chart
│   ├── TrendSignal.tsx               # Signal direction display
│   ├── FactorBreakdown.tsx           # Factor scores sidebar
│   ├── FactorCard.tsx                # Individual factor visualization
│   └── ReportCard.tsx                # AI report card (expandable)
└── layout/
    ├── Header.tsx                    # Nav, refresh, theme toggle
    └── ThemeProvider.tsx             # next-themes wrapper

lib/
├── types.ts                          # Shared TypeScript interfaces
├── hooks/useMarketData.ts            # SWR hooks
├── ai/
│   ├── types.ts                      # AiProvider interface
│   ├── factory.ts                    # Provider factory
│   └── providers/                    # OpenAI, Anthropic, Gemini
├── factors/                          # 6 market analysis factors
├── data/                             # Yahoo Finance + FRED integrations
└── reports/                          # Report generation + storage
```

### Factor Engine

The composite signal is computed from 6 independently scored factors, each ranging from -1 (bearish) to +1 (bullish):

| Factor | Weight | Data Source | Logic |
|--------|--------|-------------|-------|
| Real Interest Rate | 25% | FRED | Negative real rates favor gold |
| Technical Indicators | 20% | Yahoo Finance | SMA 50/200 crossovers, RSI 14 |
| VIX Volatility | 15% | Yahoo Finance | Elevated fear → safe-haven demand |
| ETF Capital Flows | 15% | Yahoo Finance (GLD) | Price change × volume multiplier |
| USD Strength | 15% | Yahoo Finance (DXY) | Strong dollar = gold headwind |
| Gold/Silver Ratio | 10% | Yahoo Finance | Deviation from 1-year average |

**Signal thresholds:** Bullish (score > 0.15), Bearish (score < -0.15), Neutral (in between)

### API Endpoints

| Method | Endpoint | Description | Cache |
|--------|----------|-------------|-------|
| GET | `/api/market/quotes` | Current prices (gold, silver, VIX, DXY, GLD) | 1 min |
| GET | `/api/market/history?symbol=GC=F&timeframe=1M` | OHLCV candlestick data | 10 min |
| GET | `/api/factors` | Composite signal + factor breakdown | 2 min |
| GET | `/api/reports/latest` | Latest AI-generated report | 30 min |
| GET | `/api/cron/generate-report` | Trigger report generation (auth required) | — |

### AI Report Generation

Reports are generated by sending market data and factor analysis to the configured AI provider. The AI returns structured JSON:

```json
{
  "summary": "2-3 sentence executive summary",
  "factorAnalysis": "Detailed factor-by-factor analysis",
  "outlook": "1-2 week market outlook",
  "keyRisks": ["Risk 1", "Risk 2", "Risk 3"]
}
```

Reports are stored locally in `.data/reports/{YYYY-MM-DD}.json`.

To trigger report generation manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/generate-report
```

#### Scheduling Daily Reports

For automated daily report generation, set up a cron job to call the endpoint after US market close. Here are a few options:

**System crontab (Linux/macOS):**

```bash
# Run at 10 PM ET (22:00) on weekdays
0 22 * * 1-5 curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/generate-report
```

**GitHub Actions:**

```yaml
# .github/workflows/daily-report.yml
name: Daily Market Report
on:
  schedule:
    - cron: '0 22 * * 1-5'   # 10 PM UTC, adjust for your timezone
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -s -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/generate-report
```

**Other options:**
- [cron-job.org](https://cron-job.org) — Free hosted cron service, no server required
- Cloud scheduler services (AWS EventBridge, Google Cloud Scheduler)
- PM2: `pm2 start cron.js` with a script that calls the endpoint on schedule

> **Tip:** Schedule after US market close (4 PM ET / 22:00 UTC) for the most complete daily data. Avoid weekends — futures markets have limited hours and data may be stale.

## License

MIT
