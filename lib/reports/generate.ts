import Anthropic from "@anthropic-ai/sdk";
import type { CompositeSignal, DataSnapshot, MarketReport } from "@/lib/types";

const SYSTEM_PROMPT = `You are a precious metals market analyst. Analyze the provided market data and factor signals.
Be concise and data-driven. Never speculate beyond what the data shows.
Respond in JSON format with these fields:
- summary: 2-3 sentence executive summary
- factorAnalysis: paragraph analyzing each factor's contribution
- outlook: 1-2 week outlook based on the data
- keyRisks: array of 2-3 risk factors as short strings`;

export function buildReportPrompt(
  signal: CompositeSignal,
  snapshot: DataSnapshot
): string {
  const factorLines = signal.factors
    .map(
      (f) =>
        `- ${f.name}: score ${f.score.toFixed(2)} (weight ${(f.weight * 100).toFixed(0)}%) — ${f.reasoning}`
    )
    .join("\n");

  return `Market Data Snapshot:
- Gold: $${snapshot.goldPrice.toFixed(2)}
- Silver: $${snapshot.silverPrice.toFixed(2)}
- VIX: ${snapshot.vix.toFixed(1)}
- US Dollar Index: ${snapshot.dxy.toFixed(2)}
- Real Interest Rate: ${snapshot.realRate.toFixed(2)}%

Composite Signal: ${signal.direction} (score: ${signal.score.toFixed(3)}, confidence: ${signal.confidence}%)

Factor Breakdown:
${factorLines}

Generate your analysis.`;
}

export async function generateReport(
  signal: CompositeSignal,
  snapshot: DataSnapshot
): Promise<MarketReport> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildReportPrompt(signal, snapshot) },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text);

  return {
    id: `report-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    signal,
    summary: parsed.summary,
    factorAnalysis: parsed.factorAnalysis,
    outlook: parsed.outlook,
    keyRisks: parsed.keyRisks,
    dataSnapshot: snapshot,
  };
}
