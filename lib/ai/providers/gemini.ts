import type { AiProvider } from "../types";

export class GeminiProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error("AI_API_KEY is required for Gemini provider");
    }
    this.apiKey = apiKey;
    this.model = process.env.AI_MODEL || "gemini-2.0-flash";
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          { role: "user", parts: [{ text: userPrompt }] },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini API error: no text content in response");
    }
    return text;
  }
}
