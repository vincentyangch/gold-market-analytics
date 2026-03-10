import type { AiProvider } from "../types";

export class OpenAiProvider implements AiProvider {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error("AI_API_KEY is required for OpenAI provider");
    }
    this.apiKey = apiKey;
    this.baseURL = process.env.AI_BASE_URL || "https://api.openai.com";
    this.model = process.env.AI_MODEL || "gpt-4o";
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const res = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }
}
