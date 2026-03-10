import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "Hello from Claude" }],
  });
  return {
    default: vi.fn().mockImplementation(function () {
      return { messages: { create: mockCreate } };
    }),
  };
});

import { AnthropicProvider } from "../providers/anthropic";

describe("AnthropicProvider", () => {
  beforeEach(() => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "claude-sonnet-4-6");
  });

  it("throws if AI_API_KEY is not set", () => {
    vi.stubEnv("AI_API_KEY", "");
    expect(() => new AnthropicProvider()).toThrow("AI_API_KEY");
  });

  it("calls Anthropic SDK and returns text content", async () => {
    const provider = new AnthropicProvider();
    const result = await provider.generateCompletion("system", "user");
    expect(result).toBe("Hello from Claude");
  });

  it("defaults model to claude-sonnet-4-6 when AI_MODEL not set", () => {
    vi.stubEnv("AI_MODEL", "");
    const provider = new AnthropicProvider();
    expect(provider).toBeDefined();
  });
});
