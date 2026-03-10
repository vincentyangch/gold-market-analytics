import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider } from "../types";

export class AnthropicProvider implements AiProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error("AI_API_KEY is required for Anthropic provider");
    }
    this.client = new Anthropic({
      apiKey,
      baseURL: process.env.AI_BASE_URL || undefined,
    });
    this.model = process.env.AI_MODEL || "claude-sonnet-4-6";
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Anthropic API error: no text content in response");
    }
    return textBlock.text;
  }
}
