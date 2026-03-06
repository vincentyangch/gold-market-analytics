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
