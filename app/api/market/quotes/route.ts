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
