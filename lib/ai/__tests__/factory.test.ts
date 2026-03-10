import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return { messages: { create: vi.fn() } };
    }),
  };
});

import { createProvider } from "../factory";
import { OpenAiProvider } from "../providers/openai";
import { AnthropicProvider } from "../providers/anthropic";
import { GeminiProvider } from "../providers/gemini";

describe("createProvider", () => {
  beforeEach(() => {
    vi.stubEnv("AI_API_KEY", "test-key");
  });

  it("returns OpenAiProvider when AI_PROVIDER is 'openai'", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    const provider = createProvider();
    expect(provider).toBeInstanceOf(OpenAiProvider);
  });

  it("returns AnthropicProvider when AI_PROVIDER is 'anthropic'", () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");
    const provider = createProvider();
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it("returns GeminiProvider when AI_PROVIDER is 'gemini'", () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    const provider = createProvider();
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it("throws for unknown provider", () => {
    vi.stubEnv("AI_PROVIDER", "unknown");
    expect(() => createProvider()).toThrow('Unknown AI_PROVIDER: "unknown"');
  });

  it("throws when AI_PROVIDER is not set", () => {
    vi.stubEnv("AI_PROVIDER", "");
    expect(() => createProvider()).toThrow("AI_PROVIDER");
  });
});
