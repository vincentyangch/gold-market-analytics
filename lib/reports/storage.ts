import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { MarketReport } from "@/lib/types";

const LOCAL_DIR = join(process.cwd(), ".data", "reports");

function ensureDir() {
  if (!existsSync(LOCAL_DIR)) {
    mkdirSync(LOCAL_DIR, { recursive: true });
  }
}

export async function saveReport(report: MarketReport): Promise<string> {
  ensureDir();
  const filename = `${report.generatedAt.split("T")[0]}.json`;
  const filepath = join(LOCAL_DIR, filename);
  writeFileSync(filepath, JSON.stringify(report, null, 2));
  return filepath;
}

export async function getLatestReport(): Promise<MarketReport | null> {
  ensureDir();
  const files = readdirSync(LOCAL_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  const content = readFileSync(join(LOCAL_DIR, files[0]), "utf-8");
  return JSON.parse(content);
}

export async function getReportByDate(
  date: string
): Promise<MarketReport | null> {
  try {
    const filepath = join(LOCAL_DIR, `${date}.json`);
    if (!existsSync(filepath)) return null;
    const content = readFileSync(filepath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
