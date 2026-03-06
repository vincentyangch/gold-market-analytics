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
