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

  return `You are a precious metals market analyst. Analyze the data below and respond with ONLY a JSON object (no markdown, no explanation, no text before or after the JSON).

The JSON must have exactly these fields:
{
  "summary": "2-3 sentence executive summary",
  "factorAnalysis": "paragraph analyzing each factor's contribution",
  "outlook": "1-2 week outlook based on the data",
  "keyRisks": ["risk 1", "risk 2", "risk 3"]
}

Market Data Snapshot:
- Gold: $${snapshot.goldPrice.toFixed(2)}
- Silver: $${snapshot.silverPrice.toFixed(2)}
- VIX: ${snapshot.vix.toFixed(1)}
- US Dollar Index: ${snapshot.dxy.toFixed(2)}
- Real Interest Rate: ${snapshot.realRate.toFixed(2)}%

Composite Signal: ${signal.direction} (score: ${signal.score.toFixed(3)}, confidence: ${signal.confidence}%)

Factor Breakdown:
${factorLines}

Respond with ONLY the JSON object.`;
}

export async function generateReport(
  signal: CompositeSignal,
  snapshot: DataSnapshot
): Promise<MarketReport> {
  const baseURL = process.env.OPENAI_BASE_URL || "https://529961.com";
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.4";

  // Use the Responses API (/v1/responses) directly since the proxy
  // does not support the legacy /v1/chat/completions endpoint.
  const res = await fetch(`${baseURL}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: SYSTEM_PROMPT,
      input: [
        { role: "user", content: buildReportPrompt(signal, snapshot) },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  // Responses API: output[0].content[0].text
  const text = data.output?.[0]?.content?.[0]?.text ?? "";

  // Strip markdown code fences if present, then extract JSON object
  const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
  // Find the first { ... } block in case model added surrounding text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");
  const parsed = JSON.parse(jsonMatch[0]);

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
