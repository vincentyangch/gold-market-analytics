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
