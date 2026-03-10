import type { AiProvider } from "./types";
import { OpenAiProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";

export function createProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER;
  switch (provider) {
    case "openai":
      return new OpenAiProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Use "openai", "anthropic", or "gemini".`
      );
  }
}
