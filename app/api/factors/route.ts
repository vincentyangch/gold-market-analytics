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
