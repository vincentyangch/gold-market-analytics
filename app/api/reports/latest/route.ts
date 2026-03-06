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
