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
