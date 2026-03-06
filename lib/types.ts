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
